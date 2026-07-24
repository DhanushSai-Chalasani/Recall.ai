import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let user = null
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables for middleware")
  }
  
  // Check for local mock session first (perfect for offline Demo Mode)
  // SECURITY: Only allow in non-production environments to prevent auth bypass on live deployments
  const isMockSession = process.env.NODE_ENV !== "production" &&
    request.cookies.get("sb-mock-session")?.value === "true"

  if (isMockSession) {
    user = {
      id: "mock-user-id",
      email: "demo@recall.ai",
      user_metadata: { name: "Demo User" },
    } as any
  } else if (supabaseUrl && supabaseKey && supabaseUrl !== "your-supabase-url" && supabaseKey !== "your-supabase-anon-key") {
    try {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              supabaseResponse = NextResponse.next({
                request,
              })
              cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
            },
          },
        },
      )

      const {
        data: { user: gotUser },
      } = await supabase.auth.getUser()
      user = gotUser
    } catch (err) {
      console.warn("[Middleware] Supabase auth check failed:", err)
    }
  } else {
    console.warn("[Middleware] Running in local DEMO mode without Supabase connection.")
  }

  // Helper to ensure returnUrl is a safe relative path
  const getSafeReturnUrl = (urlStr: string | null, fallback: string = "/dashboard"): string => {
    if (!urlStr) return fallback
    try {
      // Decode URL in case it's double encoded
      const decoded = decodeURIComponent(urlStr)
      // Only allow relative paths starting with / and not starting with // or /\ (which can be interpreted as protocols in some browsers)
      if (decoded.startsWith("/") && !decoded.startsWith("//") && !decoded.startsWith("/\\")) {
        return decoded
      }
    } catch {
      // ignore parsing error
    }
    return fallback
  }

  const currentPath = request.nextUrl.pathname

  // Redirect authenticated users away from auth pages
  if (user && (currentPath.startsWith("/auth/login") || currentPath.startsWith("/auth/signup"))) {
    const returnUrl = getSafeReturnUrl(request.nextUrl.searchParams.get("returnUrl"))
    return NextResponse.redirect(new URL(returnUrl, request.url))
  }

  // Redirect unauthenticated users from protected routes
  const protectedRoutes = ["/dashboard", "/meetings", "/profile", "/upgrade"]
  const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route))

  if (!user && isProtectedRoute) {
    const loginUrl = new URL("/auth/login", request.url)
    const returnPath = currentPath + request.nextUrl.search
    loginUrl.searchParams.set("returnUrl", returnPath)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

