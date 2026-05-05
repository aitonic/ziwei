export const AUTH_COOKIE_NAME = 'ziwei_auth'
export const AUTH_MAX_AGE = 60 * 60 * 24 * 90

const PUBLIC_PREFIXES = ['/assets/']
const PUBLIC_PATHS = new Set([
  '/login',
  '/favicon.ico',
  '/favicon.svg',
  '/icon-192.png',
  '/robots.txt',
])

export function isValidPassword(inputPassword, expectedPassword) {
  return Boolean(expectedPassword) && inputPassword === expectedPassword
}

export function hasAuthCookie(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .includes(`${AUTH_COOKIE_NAME}=1`)
}

export function buildAuthCookie() {
  return `${AUTH_COOKIE_NAME}=1; Max-Age=${AUTH_MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Lax`
}

export function buildClearAuthCookie() {
  return `${AUTH_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`
}

export function isPublicPath(pathname) {
  return PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function sanitizeNextPath(nextPath) {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '/'
  }

  return nextPath
}
