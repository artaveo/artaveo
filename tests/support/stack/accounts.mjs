/**
 * The three sign-in identities of the test stack. The password is a test
 * value, never a real credential. `stranger` has an auth account but NO
 * `admin_users` row — the case `getAdminSession` must treat as signed out.
 */
export const TEST_PASSWORD = 'Test-Password-123!'

export const accounts = [
  { id: '00000000-0000-4000-8000-0000000000a1', email: 'owner@test.artaveo.dev', password: TEST_PASSWORD, role: 'owner' },
  { id: '00000000-0000-4000-8000-0000000000a2', email: 'editor@test.artaveo.dev', password: TEST_PASSWORD, role: 'editor' },
  { id: '00000000-0000-4000-8000-0000000000a3', email: 'stranger@test.artaveo.dev', password: TEST_PASSWORD, role: null },
]

export const OWNER = accounts[0]
export const EDITOR = accounts[1]
export const STRANGER = accounts[2]
