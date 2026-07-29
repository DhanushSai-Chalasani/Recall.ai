import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { MOCK_MEETINGS } from "@/lib/mock-data"

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(MOCK_MEETINGS)
  }

  const { data, error } = await supabase
    .from("meetings")
    .select("id, name, tldr, duration, speakers, action_items, insights, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error || !data || data.length === 0) {
    return NextResponse.json(MOCK_MEETINGS)
  }

  // Shape to match MeetingResult type the frontend expects
  const meetings = data.map((m: any) => ({
    id: m.id,
    name: m.name,
    tldr: m.tldr,
    stats: {
      duration: m.duration,
      speakerCount: m.speakers?.length || 0,
      wordCount: 0,
      actionItemCount: m.action_items?.length || 0,
    },
    speakers: m.speakers,
    actionItems: m.action_items,
    insights: m.insights,
    created_at: m.created_at,
  }))

  return NextResponse.json(meetings)
}
