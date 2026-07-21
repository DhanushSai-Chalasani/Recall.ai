import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have proxy refreshing
          // user sessions.
        }
      },
    },
  })

  const hasMockSession = cookieStore.get("sb-mock-session")?.value === "true"
  if (hasMockSession) {
    client.auth.getUser = async (token?: string) => {
      return {
        data: {
          user: {
            id: "mock-user-id",
            email: "demo@recall.ai",
            user_metadata: { name: "Demo User" },
          } as any
        },
        error: null
      }
    }
    client.auth.getSession = async () => {
      return {
        data: {
          session: {
            user: {
              id: "mock-user-id",
              email: "demo@recall.ai",
              user_metadata: { name: "Demo User" },
            } as any
          } as any
        },
        error: null
      }
    }
  }

  return client
}
