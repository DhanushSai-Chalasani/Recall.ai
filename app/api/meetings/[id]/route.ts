import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { MOCK_MEETING, MOCK_MEETINGS } from "@/lib/mock-data"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Check if this is a demo meeting ID first
  const mockMeeting = MOCK_MEETINGS.find((m) => m.id === id) || (id === "demo-001" ? MOCK_MEETING : null)

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    if (mockMeeting) {
      return NextResponse.json(mockMeeting)
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Shape to match MeetingResult
  return NextResponse.json({
    id: data.id,
    name: data.name,
    tldr: data.tldr,
    keyQuote: data.key_quote,
    stats: data.stats || {
      duration: data.duration,
      speakerCount: data.speakers?.length || 1,
      wordCount: 0,
      actionItemCount: data.action_items?.length || 0,
    },
    speakers: data.speakers,
    transcript: data.transcript,
    actionItems: data.action_items,
    insights: data.insights,
    audioUrl: data.audio_url,
    created_at: data.created_at,
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (id.startsWith("demo-")) {
    return NextResponse.json({ success: true })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch the meeting to get its audio_url
  const { data: meeting, error: fetchError } = await supabase
    .from("meetings")
    .select("audio_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
  }

  // If there's an audio file associated, delete it from storage
  if (meeting.audio_url) {
    try {
      const url = new URL(meeting.audio_url)
      const pathParts = url.pathname.split("/")
      const fileName = pathParts[pathParts.length - 1]
      
      if (fileName) {
        const adminSupabase = createAdminClient()
        const { error: storageError } = await adminSupabase.storage
          .from("meetings-audio")
          .remove([fileName])

        if (storageError) {
          console.error("Supabase Storage error deleting file:", storageError.message)
        }
      }
    } catch (err) {
      console.error("Failed to parse audio_url or delete file:", err)
    }
  }

  const { error } = await supabase
    .from("meetings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (id.startsWith("demo-")) {
    const mock = MOCK_MEETINGS.find((m) => m.id === id) || MOCK_MEETING
    const body = await req.json().catch(() => ({}))
    const updatedActionItems = body.actionItems !== undefined ? body.actionItems : (body.action_items !== undefined ? body.action_items : mock.actionItems)
    const updated = {
      ...mock,
      name: body.name !== undefined ? body.name : mock.name,
      actionItems: updatedActionItems,
      stats: {
        ...(mock.stats || {}),
        actionItemCount: updatedActionItems ? updatedActionItems.length : (mock.stats?.actionItemCount || 0)
      },
      insights: {
        ...mock.insights,
        ...(body.insights || {}),
      },
    }
    return NextResponse.json(updated)
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch the existing meeting first
  const { data: existing, error: fetchError } = await supabase
    .from("meetings")
    .select("insights, name, action_items")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const body = await req.json()
    const { name, insights, actionItems, action_items } = body

    const updateData: any = {}
    if (name !== undefined) {
      updateData.name = name
    }
    if (actionItems !== undefined) {
      updateData.action_items = actionItems
    } else if (action_items !== undefined) {
      updateData.action_items = action_items
    }
    if (insights !== undefined) {
      updateData.insights = {
        ...(existing.insights || {}),
        ...insights,
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("meetings")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      tldr: data.tldr,
      keyQuote: data.key_quote,
      stats: data.stats || {
        duration: data.duration,
        speakerCount: data.speakers?.length || 1,
        wordCount: 0,
        actionItemCount: data.action_items?.length || 0,
      },
      speakers: data.speakers,
      transcript: data.transcript,
      actionItems: data.action_items,
      insights: data.insights,
      audioUrl: data.audio_url,
      created_at: data.created_at,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}


