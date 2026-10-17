/**
 * Admin authentication and authorization through the REAL server actions and
 * `getAdminSession`, against the real database (roadmap § 13). Sessions are
 * created the way the app creates them: `adminSignIn` signs in through the
 * (stand-in) Neon Auth service and `@neondatabase/auth` writes the session
 * cookie into the request's cookie jar; every later call reads it back.
 *
 * Two-factor (enrolment, challenge, replay, removal) IS covered: the codes are
 * the app's own (lib/admin/totp.ts), computed here with the same function.
 *
 * NOT covered here (the stand-in auth service does not implement them):
 * password policy, lockout, token refresh.
 */
import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import { EDITOR, OWNER, STRANGER, TEST_PASSWORD } from '../support/stack/accounts.mjs'
import { service, sql, uuid } from '../support/stack-env.mjs'
import { cookieNames, resetRequest } from '../support/next-runtime.mjs'

const { adminSignIn, adminSignOut, enrollMfaStart, enrollMfaVerify, verifyMfaChallenge } = await import('../../app/actions/admin-auth.ts')
const { getAdminSession, mfaSatisfied } = await import('../../lib/admin/auth.ts')
const totp = await import('../../lib/admin/totp.ts')
const { transitionInquiryStage, updateInquiryPriority, addInquiryNote, exportInquiriesCsv } = await import('../../app/actions/pipeline.ts')
const { retryNotification, sendDueNotifications } = await import('../../app/actions/notifications.ts')
const { createProject } = await import('../../app/actions/content.ts')

const db = service()
const form = (email, password) => {
  const f = new FormData()
  f.set('email', email)
  f.set('password', password)
  return f
}
const signIn = async (account, password = account.password) => adminSignIn(form(account.email, password))
const auditActions = async () => (await db.from('audit_log').select('action, actor').order('at')).data ?? []

let inquiryId
beforeEach(async () => {
  resetRequest()
  sql('truncate public.audit_log')
  if (!inquiryId) {
    const made = await db.from('inquiries').insert({
      idempotency_key: uuid(), goal: 'Authorization probe goal', name: 'Authz Probe', email: 'authz@example.com',
      preferred_locale: 'en', preferred_channel: 'email', consent: true,
    }).select('id').single()
    inquiryId = made.data.id
  }
})

describe('sign-in', () => {
  it('the owner signs in and gets a session with the right role', async () => {
    assert.deepEqual(await signIn(OWNER), { ok: true, next: 'dashboard' })
    const session = await getAdminSession()
    assert.equal(session.role, 'owner')
    assert.equal(session.userId, OWNER.id)
    assert.equal(session.email, OWNER.email)
    assert.ok(cookieNames().some((n) => n.startsWith('__Secure-neon-auth.')), 'a Neon Auth session cookie was set')
  })
  it('the editor signs in with the editor role', async () => {
    await signIn(EDITOR)
    assert.equal((await getAdminSession()).role, 'editor')
  })
  it('no cookie → no session', async () => {
    assert.equal(await getAdminSession(), null)
  })
  it('a wrong password and an unknown e-mail give the SAME answer (no account enumeration)', async () => {
    const wrong = await signIn(OWNER, 'not-the-password')
    const unknown = await adminSignIn(form('nobody@test.artaveo.dev', TEST_PASSWORD))
    assert.deepEqual(wrong, { ok: false, code: 'invalid-credentials' })
    assert.deepEqual(unknown, wrong)
    assert.equal(await getAdminSession(), null)
  })
  it('empty fields are refused before any auth call', async () => {
    assert.deepEqual(await adminSignIn(form('', '')), { ok: false, code: 'invalid-credentials' })
  })
  it('a real auth account with NO admin row is refused with the same answer and left signed out', async () => {
    assert.deepEqual(await signIn(STRANGER), { ok: false, code: 'invalid-credentials' })
    assert.equal(await getAdminSession(), null)
  })
  it('every attempt is audited — success, failure and "not an admin" each under its own action', async () => {
    await signIn(OWNER)
    resetRequest()
    await signIn(OWNER, 'bad')
    resetRequest()
    await signIn(STRANGER)
    const actions = (await auditActions()).map((a) => a.action)
    assert.deepEqual(actions.sort(), ['admin.sign_in_failed', 'admin.sign_in_rejected_not_admin', 'admin.sign_in_succeeded'])
  })
  it('a forged session cookie is not a session', async () => {
    await signIn(OWNER)
    const jar = globalThis.__TEST_NEXT__.cookies
    for (const [name, value] of jar) jar.set(name, value.slice(0, -6) + 'AAAAAA') // corrupt the token
    assert.equal(await getAdminSession(), null)
  })
  it('sign-out ends the session and redirects to the login page of the same locale', async () => {
    await signIn(OWNER)
    let destination = null
    try {
      await adminSignOut('fa')
    } catch (err) {
      destination = err.destination
    }
    assert.equal(destination, '/fa/admin/login')
    assert.equal(await getAdminSession(), null)
    assert.ok((await auditActions()).some((a) => a.action === 'admin.sign_out'))
  })
})

describe('authorization matrix — who may do what', () => {
  const asOwner = () => signIn(OWNER)
  const asEditor = () => signIn(EDITOR)
  const asStranger = () => signIn(STRANGER)
  const nobody = async () => {}
  const stranger = async () => asStranger() // refused sign-in leaves no session

  const leadActions = {
    transitionInquiryStage: () => transitionInquiryStage(inquiryId, 'reviewed'),
    updateInquiryPriority: () => updateInquiryPriority(inquiryId, 'high'),
    addInquiryNote: () => addInquiryNote(inquiryId, 'a note'),
    exportInquiriesCsv: () => exportInquiriesCsv({}),
    retryNotification: () => retryNotification(uuid()),
    sendDueNotifications: () => sendDueNotifications(),
  }

  for (const [name, call] of Object.entries(leadActions)) {
    it(`${name}: owner allowed; editor, unrelated login and anonymous all forbidden`, async () => {
      for (const [who, login] of [['editor', asEditor], ['stranger', stranger], ['anonymous', nobody]]) {
        resetRequest()
        await login()
        assert.deepEqual(await call(), { ok: false, code: 'forbidden' }, `${who} reached ${name}`)
      }
      resetRequest()
      await asOwner()
      const result = await call()
      assert.notEqual(result.code, 'forbidden', `owner was refused ${name}`)
    })
  }

  it('editor content actions: an editor may, the owner may, anonymous may not', async () => {
    const input = (slug) => ({
      slug, title: { en: 'T', fa: 'ت' }, category: { en: 'C', fa: 'د' }, summary: { en: 'S', fa: 'خ' },
      highlights: [], coverMediaId: null, liveUrl: null, year: null, relatedServiceSlug: null, featured: false, technologyIds: [],
      showInPortfolio: true, isProduct: false, brandColor: null, accentColor: null, industry: null, platforms: [], outcomeLine: null, features: [],
    })
    assert.deepEqual(await createProject(input(`authz-${uuid().slice(0, 6)}`)), { ok: false, code: 'forbidden' })
    for (const login of [asEditor, asOwner]) {
      resetRequest()
      await login()
      const result = await createProject(input(`authz-${uuid().slice(0, 6)}`))
      assert.equal(result.ok, true)
    }
  })

  it('an expired/invalid session grants nothing, even to a former owner', async () => {
    await asOwner()
    for (const [name] of globalThis.__TEST_NEXT__.cookies) globalThis.__TEST_NEXT__.cookies.set(name, 'garbage')
    assert.deepEqual(await transitionInquiryStage(inquiryId, 'reviewed'), { ok: false, code: 'forbidden' })
  })

  it('an admin whose admin row is removed loses access on the very next call (no cached role)', async () => {
    await asEditor()
    assert.equal((await getAdminSession()).role, 'editor')
    sql(`delete from public.admin_users where id = '${EDITOR.id}'`)
    try {
      assert.equal(await getAdminSession(), null)
    } finally {
      sql(`insert into public.admin_users (id, role) values ('${EDITOR.id}', 'editor') on conflict (id) do nothing`)
    }
  })

  it('a role cannot be changed to something outside owner/editor (database constraint)', () => {
    const outcome = sql(`update public.admin_users set role = 'superuser' where id = '${EDITOR.id}'`, { allowError: true })
    assert.match(outcome.error ?? '', /admin_users_role_check|check constraint/)
  })
})

describe('two-factor (TOTP, the app\'s own — lib/admin/totp.ts)', () => {
  const { codeAt, currentStep } = totp
  const codeForm = (code, factorId) => {
    const f = new FormData()
    f.set('code', code)
    if (factorId) f.set('factorId', factorId)
    return f
  }
  const clearFactor = () => sql(`update public.admin_users set totp_secret = null, totp_pending_secret = null, totp_enrolled_at = null, totp_last_step = null where id = '${OWNER.id}'`)

  it('enrol, sign out, challenge on the next sign-in, refuse replays, remove', async () => {
    clearFactor()
    try {
      await signIn(OWNER)
      const started = await enrollMfaStart()
      assert.equal(started.ok, true)
      assert.match(started.qrCodeSvg, /^data:image\/svg\+xml;utf8,/)
      const stored = sql(`select totp_pending_secret from public.admin_users where id = '${OWNER.id}'`)
      assert.ok(stored.startsWith('v1.') && !stored.includes(started.secret), 'the secret is stored encrypted')

      const wrong = codeAt(started.secret, currentStep()) === '000000' ? '111111' : '000000'
      assert.deepEqual(await enrollMfaVerify(codeForm(wrong, started.factorId)), { ok: false, code: 'invalid-code' })
      const enrolledStep = currentStep()
      assert.deepEqual(await enrollMfaVerify(codeForm(codeAt(started.secret, enrolledStep), started.factorId)), { ok: true })
      assert.deepEqual((await getAdminSession()).aal, { current: 'aal2', next: 'aal2' })

      resetRequest()
      assert.deepEqual(await signIn(OWNER), { ok: true, next: 'mfa-challenge' })
      assert.equal(mfaSatisfied(await getAdminSession()), false)
      assert.deepEqual(await createProject({}), { ok: false, code: 'forbidden' }, 'nothing is reachable before the code')
      assert.equal((await enrollMfaStart()).code, 'forbidden', 'the factor cannot be swapped before it is passed')
      assert.deepEqual(await verifyMfaChallenge(codeForm(codeAt(started.secret, enrolledStep))), { ok: false, code: 'invalid-code' }, 'the enrolment code is used up')
      const fresh = codeAt(started.secret, enrolledStep + 1)
      const lastStep = sql(`select totp_last_step from public.admin_users where id = '${OWNER.id}'`)
      assert.deepEqual(
        await verifyMfaChallenge(codeForm(fresh)),
        { ok: true },
        `next code (step ${enrolledStep + 1}) refused: stored last step ${lastStep}, current step ${currentStep()}`,
      )
      assert.equal(sql(`select totp_last_step from public.admin_users where id = '${OWNER.id}'`), String(enrolledStep + 1), 'the accepted step is recorded')
      assert.equal(mfaSatisfied(await getAdminSession()), true)
      assert.deepEqual(await verifyMfaChallenge(codeForm(fresh)), { ok: false, code: 'invalid-code' }, 'each code works once')

      const jar = globalThis.__TEST_NEXT__.cookies
      jar.set('artaveo_mfa', jar.get('artaveo_mfa').replace(/^[^.]+/, uuid()))
      assert.equal(mfaSatisfied(await getAdminSession()), false, 'a second-factor cookie only counts for the session it names')

      const actions = (await auditActions()).map((a) => a.action)
      for (const action of ['admin.mfa_enroll_failed', 'admin.mfa_enrolled', 'admin.mfa_challenge_failed', 'admin.mfa_challenge_succeeded']) assert.ok(actions.includes(action), action)
    } finally {
      clearFactor()
    }
  })
})
