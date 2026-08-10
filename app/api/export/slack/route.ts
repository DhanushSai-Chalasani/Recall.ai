import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/supabase/auth-helper"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimitResult = rateLimit(user.id, RATE_LIMITS.EXPORT)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait.", retryAfterMs: rateLimitResult.retryAfterMs },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { meetingName, tldr, actionItems, webhookUrl } = body

    if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.startsWith("https://hooks.slack.com/")) {
      return NextResponse.json({ error: "Valid Slack Webhook URL required (https://hooks.slack.com/...)" }, { status: 400 })
    }

    // Format Slack blocks payload
    const blocks: any[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📝 Recall.ai Meeting Notes: ${meetingName || "Untitled Meeting"}`,
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*TL;DR Summary:*\n${tldr || "No summary provided."}`
        }
      },
      {
        type: "divider"
      }
    ]

    if (Array.isArray(actionItems) && actionItems.length > 0) {
      const itemsList = actionItems
        .map((item: any) => `• [${item.done ? "✔ DONE" : "PENDING"}] *${item.text}* ${item.assignee ? `_(Assignee: ${item.assignee})_` : ""}`)
        .join("\n")

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Action Items (${actionItems.length}):*\n${itemsList}`
        }
      })
    }

    // Send payload to Slack Webhook
    const slackRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks })
    })

    if (!slackRes.ok) {
      const errorText = await slackRes.text()
      return NextResponse.json({ error: `Slack API error: ${errorText}` }, { status: 502 })
    }

    return NextResponse.json({ success: true, message: "Sent successfully to Slack!" })
  } catch (error: any) {
    console.error("[Slack Export Error]:", error)
    return NextResponse.json({ error: error.message || "Failed to dispatch to Slack" }, { status: 500 })
  }
}
