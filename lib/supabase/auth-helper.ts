import "server-only"

import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextRequest } from "next/server"

/**
 * Authenticate a user from either:
 * 1. Bearer token in Authorization header (mobile apps)
 * 2. Cookie-based session (web app)
 * 
 * This enables the same API routes to serve both web and mobile clients.
 * 
 * Usage:
 *   import { getAuthenticatedUser } from "@/lib/supabase/auth-helper";
 *   
 *   const user = await getAuthenticatedUser(req);
 *   if (!user) {
 *     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   }
 */
export async function getAuthenticatedUser(req: NextRequest) {
  // Strategy 1: Check for Bearer token (mobile / API clients)
  const authHeader = req.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    
    if (!token || token.length < 10) {
      return null
    }

    try {
      // Use a lightweight Supabase client to validate the JWT token
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      )

      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) {
        console.warn("[Auth Helper] Bearer token validation failed:", error?.message)
        return null
      }
      return user
    } catch (err) {
      console.error("[Auth Helper] Bearer token error:", err)
      return null
    }
  }

  // Strategy 2: Fall back to cookie-based session (web app / Next.js SSR)
  try {
    const cookieStore = await cookies()
    const hasMockSession = process.env.NODE_ENV !== "production" &&
      cookieStore.get("sb-mock-session")?.value === "true"
    if (hasMockSession) {
      return {
        id: "mock-user-id",
        email: "demo@recall.ai",
        user_metadata: { name: "Demo User" },
      } as any
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore: setAll called from Server Component context
            }
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  } catch (err) {
    console.error("[Auth Helper] Cookie session error:", err)
    return null
  }
}
