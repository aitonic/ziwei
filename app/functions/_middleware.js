import { hasAuthCookie, isPublicPath, sanitizeNextPath } from './auth.js'

export async function onRequest(context) {
  const url = new URL(context.request.url)

  if (isPublicPath(url.pathname)) {
    return context.next()
  }

  if (hasAuthCookie(context.request.headers.get('Cookie') || '')) {
    return context.next()
  }

  const nextPath = sanitizeNextPath(`${url.pathname}${url.search}`)
  const loginUrl = new URL('/login', url)
  loginUrl.searchParams.set('next', nextPath)

  return Response.redirect(loginUrl.toString(), 302)
}
