import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          // Update the outgoing response cookie
          response = NextResponse.next({ request });
          response.cookies.set(name, value, options);
        },
        remove(name, options) {
          // Clear the cookie on the response; no need to touch request.cookies
          response = NextResponse.next({ request });
          response.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}