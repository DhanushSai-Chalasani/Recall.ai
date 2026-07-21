import { createBrowserClient } from "@supabase/ssr"

export const supabase = (typeof window !== "undefined"
  ? createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  : null as any) as ReturnType<typeof createBrowserClient>
