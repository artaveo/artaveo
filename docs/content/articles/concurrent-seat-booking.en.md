Two people open the same bus trip and tap the same seat. Both screens show it as free, and both people are right about what they see. Only one of them can be right about the seat. This note is about where that decision has to be made, and what I did about it in Transportation System, my own intercity bus booking project.

> [!NOTE] Scope
> Everything here is about the booking core: seats, holds and confirmation. The project has no live payment gateway yet, so this is not a story about payments.

## The browser can ask, only the database can decide

The seat map in the browser is a picture of the database at the moment the page loaded. By the time someone taps a seat, that picture can be seconds old. If the browser asks "is it still free?" and then books it, it is racing the next person who does exactly the same thing.

So the browser never decides. It asks the server to hold the seats, the server asks a Postgres function to do it, and the answer is one of two things: it worked, or it did not.

```ts
const supabase = createServiceClient()
const { data, error } = await supabase.rpc("hold_seats", {
  p_trip_id: tripId,
  p_seat_ids: seatIds,
  p_hold_minutes: HOLD_MINUTES,
})

if (error) {
  if (error.message.includes("SEATS_UNAVAILABLE")) {
    return NextResponse.json({ error: "SEATS_UNAVAILABLE" }, { status: 409 })
  }
  console.error("[api/bookings/hold]", error.message)
  return NextResponse.json({ error: "UNKNOWN" }, { status: 500 })
}
```

That is an excerpt of the Route Handler, and it is the only door. It calls the function with a service-role client that exists only on the server, never from a Client Component. The request is checked before it gets that far: the number of seats is capped at six on the server as well as in the interface.

## A seat has three states and a deadline

Every seat of every trip is one row. Besides "available" and "booked" there is a third state in between, "held", together with the time its hold runs out. A unique constraint stops a trip from having two rows for the same seat number.

```sql
create type seat_status as enum ('available', 'held', 'booked');

create table trip_seats (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  seat_number text not null,
  row_number int not null,
  col_label text not null,
  status seat_status not null default 'available',
  held_until timestamptz,
  created_at timestamptz not null default now(),
  constraint trip_seats_unique_per_trip unique (trip_id, seat_number)
);
```

## One statement, all or nothing

`hold_seats` is a single `UPDATE` that only touches seats that are still available, or whose hold has run out, and returns the rows it changed. If the number of rows it really updated is not the number of seats requested, the function raises an exception and Postgres rolls the whole operation back.

Two things follow from that, and they are the two I care about. Two requests for the same seat cannot both succeed. And a request for three seats where one has just been taken gets none of them, not two.

The alternative I avoided is doing it from JavaScript: read the seats, check them, write them. That is three steps, and another request can slip in between any two of them. Inside one statement there is no between.

When the function refuses, the message carries `SEATS_UNAVAILABLE`, the Route Handler turns it into a 409, and the traveler sees a clear message instead of a success that is not true.

## Holds expire without a background job

A hold lasts ten minutes. A seat that is still marked "held" but whose deadline has passed is treated as free in three places: the seat map, the count of seats left, and `hold_seats` itself. Nothing has to run on a schedule to release it. When a traveler leaves the checkout page there is also a `release_seats` function for freeing the seats immediately.

The cost is honest and small: without a scheduled sweep, expired rows stay marked "held" until something touches them, so an admin cannot read an exact count of currently held seats straight from the table. If that number ever matters, a real sweep is the next step.

## A permission that only existed in the write-up

The write-up for that phase said `hold_seats`, `release_seats` and `confirm_booking` had been revoked from the `anon` and `authenticated` roles and granted to `service_role` only. A later, direct look at the function permissions on the live Supabase project (`pg_proc.proacl`) showed that the revoke had never actually run.

That meant anyone holding the public anon key, which is in the browser by design, could have called these functions directly through Supabase's REST API and skipped every check in the Route Handlers. I fixed it in the next phase:

```sql
revoke execute on function public.hold_seats(uuid, uuid[], integer) from public, anon, authenticated;
grant execute on function public.hold_seats(uuid, uuid[], integer) to service_role;
```

The same pair of statements covers `release_seats` and `confirm_booking`. The lesson is small and practical: "access is closed" in a document is not access being closed. Ask the database.

## What I check on any booking system now

- Who decides who owns a seat? It should be the database, not the page.
- Is claiming a seat and checking that it was free one atomic operation?
- Does every hold have a deadline, and what cleans up after it?
- On the live database, who can call the function? Not what the docs say.
- Does a second browser tab, on the same seat at the same moment, get a clear refusal?

That last check needs no tooling: open the same trip in two tabs, choose the same seat in both, and press continue together. Exactly one of them should be told the seat is gone.
