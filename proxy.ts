import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  response.headers.set(
    'Content-Security-Policy',
    `
      default-src 'self' blob: data:;
      script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:;
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https:;
      media-src * blob: data:;
      connect-src *;
      frame-src
        'self'
        https://www.vidking.net
        https://vidsrc-embed.ru;
      child-src
        'self'
        https://www.vidking.net
        https://vidsrc-embed.ru;
    `
      .replace(/\n/g, ' ')
      .trim()
  );

  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};