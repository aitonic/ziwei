import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTH_COOKIE_NAME,
  buildAuthCookie,
  buildClearAuthCookie,
  hasAuthCookie,
  isPublicPath,
  isValidPassword,
  sanitizeNextPath,
} from '../functions/auth.js'

test('accepts matching auth password only', () => {
  assert.equal(isValidPassword('star-pass', 'star-pass'), true)
  assert.equal(isValidPassword('wrong-pass', 'star-pass'), false)
  assert.equal(isValidPassword('star-pass', ''), false)
})

test('detects auth cookie among multiple cookies', () => {
  assert.equal(hasAuthCookie(`${AUTH_COOKIE_NAME}=1; theme=dark`), true)
  assert.equal(hasAuthCookie(`theme=dark; ${AUTH_COOKIE_NAME}=1`), true)
  assert.equal(hasAuthCookie(`${AUTH_COOKIE_NAME}=0`), false)
  assert.equal(hasAuthCookie(''), false)
})

test('builds ninety day secure auth cookie', () => {
  assert.equal(
    buildAuthCookie(),
    `${AUTH_COOKIE_NAME}=1; Max-Age=7776000; Path=/; HttpOnly; Secure; SameSite=Lax`
  )
})

test('builds expired auth cookie', () => {
  assert.equal(
    buildClearAuthCookie(),
    `${AUTH_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`
  )
})

test('allows login and asset paths without an auth cookie', () => {
  assert.equal(isPublicPath('/login'), true)
  assert.equal(isPublicPath('/favicon.svg'), true)
  assert.equal(isPublicPath('/assets/app.js'), true)
  assert.equal(isPublicPath('/'), false)
  assert.equal(isPublicPath('/chart'), false)
})

test('keeps login redirects inside the site', () => {
  assert.equal(sanitizeNextPath('/chart?tab=fortune'), '/chart?tab=fortune')
  assert.equal(sanitizeNextPath('https://example.com'), '/')
  assert.equal(sanitizeNextPath('//example.com'), '/')
  assert.equal(sanitizeNextPath(''), '/')
})
