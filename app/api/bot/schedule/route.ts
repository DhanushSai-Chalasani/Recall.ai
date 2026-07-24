import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/auth-helper";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { Queue } from "bullmq";

// Initialize BullMQ queue client connection to Redis with grace fallback
let autopilotQueue: Queue | null = null;
try {
  const connection = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
  };
  autopilotQueue = new Queue("autopilot-bots", { 
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: true,
    }
  });
  // BullMQ emits errors on the queue instance when connection fails; without this listener, it crashes the app
  autopilotQueue.on("error", (err: any) => {
    console.warn("[Autopilot Queue Background Error] Redis connection failed:", err.message);
  });
} catch (e: any) {
  console.warn("[Autopilot Queue] Could not create Queue instance:", e.message);
}

// Helper to add job with a strict timeout to avoid blocking execution if Redis is offline
const addJobWithTimeout = async (queue: Queue, name: string, data: any, opts: any) => {
  const enqueuePromise = queue.add(name, data, opts);
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Redis Queue connection timed out (Redis may be offline)")), 1500)
  );
  return Promise.race([enqueuePromise, timeoutPromise]);
};

export async function POST(req: NextRequest) {
  try {
    // --- AUTH (supports both cookie sessions and Bearer tokens for mobile) ---
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in to schedule." }, { status: 401 });
    }

    // --- RATE LIMITING (Fix #8) ---
    const rateLimitResult = rateLimit(user.id, RATE_LIMITS.BOT_SCHEDULE);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before scheduling again.", retryAfterMs: rateLimitResult.retryAfterMs },
        { status: 429 }
      );
    }

    const adminClient = createAdminClient();

    const { link, scheduledAt, botName, settings } = await req.json();

    if (!link || !scheduledAt) {
      return NextResponse.json({ error: "Missing required fields: link or scheduledAt" }, { status: 400 });
    }

    // --- SSRF PROTECTION (Fix #3) ---
    const allowedDomains = ["meet.google.com", "zoom.us", "teams.microsoft.com", "teams.live.com"];
    try {
      const parsedUrl = new URL(link);
      if (parsedUrl.protocol !== "https:") {
        return NextResponse.json({ error: "Only HTTPS meeting links are allowed." }, { status: 400 });
      }
      // SSRF HARDENING: exact match or dot-prefixed subdomain only.
      // endsWith("zoom.us") alone would match "evil-zoom.us".
      const domainMatch = allowedDomains.some((domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith("." + domain));
      if (!domainMatch) {
        return NextResponse.json(
          { error: "Invalid meeting link. Only Google Meet, Zoom, and MS Teams links are supported." },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL format." }, { status: 400 });
    }

    // Platform detector logic
    let platform: "google-meet" | "zoom" | "teams" | "custom" = "custom";
    if (link.includes("meet.google.com")) {
      platform = "google-meet";
    } else if (link.includes("zoom.us")) {
      platform = "zoom";
    } else if (link.includes("teams.microsoft")) {
      platform = "teams";
    }

    // Insert the scheduling record into the `bot_schedules` table
    const { data, error } = await adminClient
      .from("bot_schedules")
      .insert({
        user_id: user.id,
        meeting_link: link,
        scheduled_at: scheduledAt,
        bot_name: botName || "Recall Note Taker",
        platform,
        settings: settings || { diarize: true, actions: true, language: "en", style: "detailed" },
        status: "scheduled"
      })
      .select()
      .single();

    if (error) {
      console.error("[Autopilot API Supabase Error]:", error.message);
      // Fallback in case migrations haven't been applied yet locally (Demo/Fallback Mode)
      if (
        error.code === "PGRST116" || 
        error.message.includes("does not exist") || 
        error.message.includes("schema cache") || 
        error.message.includes("Could not find the table")
      ) {
        console.warn("[Autopilot] Table 'bot_schedules' not found. Falling back to mock success.");
        
        const mockData = {
          id: crypto.randomUUID(),
          user_id: user.id,
          meeting_link: link,
          scheduled_at: scheduledAt,
          bot_name: botName || "Recall Note Taker",
          platform,
          settings: settings || { diarize: true, actions: true, language: "en", style: "detailed" },
          status: "scheduled",
          created_at: new Date().toISOString()
        };

        // Attempt queue enqueue for mock success too with strict timeout
        if (autopilotQueue) {
          try {
            const delayMs = new Date(scheduledAt).getTime() - Date.now();
            await addJobWithTimeout(autopilotQueue, "join-meeting", {
              scheduleId: mockData.id,
              link,
              botName: mockData.bot_name,
              settings: mockData.settings
            }, { delay: Math.max(0, delayMs) });
          } catch (qErr: any) {
            console.warn("[Autopilot Fallback Queue Warning] Failed to enqueue fallback job:", qErr.message);
          }
        }

        return NextResponse.json({
          success: true,
          message: "Scheduled (Mock Fallback - Apply Migrations!)",
          data: mockData
        });
      }
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    // Enqueue actual BullMQ job with strict timeout
    if (autopilotQueue) {
      try {
        const delayMs = new Date(scheduledAt).getTime() - Date.now();
        await addJobWithTimeout(autopilotQueue, "join-meeting", {
          scheduleId: data.id,
          link,
          botName: data.bot_name,
          settings: data.settings
        }, { 
          delay: Math.max(0, delayMs),
          removeOnComplete: true,
          removeOnFail: true,
        });
        console.log(`[Autopilot Queue] Enqueued job for schedule ${data.id} with ${delayMs}ms delay`);
      } catch (queueErr: any) {
        console.error("[Autopilot Queue Error] Failed to enqueue job:", queueErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Autopilot successfully scheduled",
      data
    });
  } catch (error: any) {
    console.error("[Autopilot API Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to schedule bot" }, { status: 500 });
  }
}
