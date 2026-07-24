import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthenticatedUser } from "@/lib/supabase/auth-helper"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { HfInference } from "@huggingface/inference"
import OpenAI from "openai"
import { z } from "zod"

const SearchPayloadSchema = z.object({
  query: z.string(),
  meetingId: z.string().uuid().optional().nullable(),
  meetingType: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    // --- AUTH (supports both cookie sessions and Bearer tokens for mobile) ---
    const user = await getAuthenticatedUser(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // --- RATE LIMITING (Fix #8) ---
    const rateLimitResult = rateLimit(user.id, RATE_LIMITS.VAULT_SEARCH)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before searching again.", retryAfterMs: rateLimitResult.retryAfterMs },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const parsed = SearchPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload parameters", details: parsed.error.format() }, { status: 400 })
    }

    const { query, meetingId, meetingType, startDate, endDate } = parsed.data

    if (!process.env.HF_TOKEN) {
      return NextResponse.json({ error: "Hugging Face token is missing from environment" }, { status: 500 })
    }
    if (!process.env.NVIDIA_API_KEY) {
      return NextResponse.json({ error: "NVIDIA NIM API key is missing from environment" }, { status: 500 })
    }

    const hf = new HfInference(process.env.HF_TOKEN)
    const nvidia = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    })

    // 1. Embed the user's query using HuggingFace
    const queryEmbedding = await hf.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      inputs: query,
    }) as number[]

    // 2. Vector similarity search in Supabase using the optimized match_meeting_embeddings_v2 RPC
    // SECURITY AUDIT: match_user_id is derived from the server-side authenticated session
    // (getAuthenticatedUser), NEVER from client-supplied input. This prevents horizontal
    // privilege escalation. RLS on meeting_embeddings independently enforces auth.uid() = user_id
    // as a belt-and-suspenders second layer.
    const admin = createAdminClient()
    const { data: chunks, error: rpcError } = await admin.rpc("match_meeting_embeddings_v2", {
      query_embedding: queryEmbedding,
      match_user_id: user.id,
      match_threshold: 0.55, // lowered slightly for better recall in filtered environments
      match_count: 8,
      filter_meeting_id: meetingId || null,
      filter_meeting_type: meetingType || null,
      filter_start_date: startDate || null,
      filter_end_date: endDate || null,
    })

    if (rpcError) {
      console.error("[RAG Search RPC Error]:", rpcError.message)
      // Fallback in case match_meeting_embeddings_v2 hasn't been created yet on the live db (V1 backward compatibility)
      if (rpcError.message.includes("does not exist")) {
        console.warn("[RAG Search] Fallback to match_meeting_embeddings v1 (No DB filters applied)")
        const { data: chunksV1 } = await admin.rpc("match_meeting_embeddings", {
          query_embedding: queryEmbedding,
          match_user_id: user.id,
          match_threshold: 0.6,
          match_count: 6,
        })
        if (!chunksV1 || chunksV1.length === 0) {
          return NextResponse.json({ answer: "I couldn't find any relevant details in your past meetings.", sources: [] })
        }
        
        // Fetch meeting titles/dates manually for V1 chunks
        const meetingIds = Array.from(new Set(chunksV1.map((c: any) => c.meeting_id)))
        const { data: meetings } = await admin
          .from("meetings")
          .select("id, name, created_at, insights")
          .in("id", meetingIds)
        
        const meetingMap = new Map(meetings?.map(m => [m.id, m]) || [])
        
        const enrichedChunks = chunksV1.map((c: any) => {
          const m = meetingMap.get(c.meeting_id)
          return {
            meeting_id: c.meeting_id,
            meeting_name: m?.name || "Untitled Meeting",
            meeting_created_at: m?.created_at || new Date().toISOString(),
            meeting_type: m?.insights?.meetingType || "General Discussion",
            chunk_text: c.chunk_text,
            similarity: c.similarity
          }
        })
        
        return handleSynthesis(query, enrichedChunks, nvidia)
      }
      return NextResponse.json({ error: `Database query failed: ${rpcError.message}` }, { status: 500 })
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ 
        answer: "I couldn't find any details in your meeting history matching the criteria for that question.",
        sources: [] 
      })
    }

    return handleSynthesis(query, chunks, nvidia)
  } catch (error: any) {
    console.error("[Vault Search Error]:", error)
    return NextResponse.json({ error: error.message || "Failed to query meeting vault" }, { status: 500 })
  }
}

async function handleSynthesis(query: string, chunks: any[], nvidia: OpenAI) {
  // Sort chunks chronologically by meeting creation date
  const sortedChunks = [...chunks].sort((a, b) => {
    return new Date(a.meeting_created_at).getTime() - new Date(b.meeting_created_at).getTime()
  })

  // Format context with clear meeting visual headers for LLM temporal awareness
  const context = sortedChunks
    .map((chunk) => {
      const dateStr = new Date(chunk.meeting_created_at).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
      return `### Meeting Segment: "${chunk.meeting_name}" (${dateStr})\nType: ${chunk.meeting_type}\nSimilarity: ${Math.round(chunk.similarity * 100)}%\n\n"${chunk.chunk_text}"`
    })
    .join("\n\n---\n\n")

  // Generate answering synthesis
  const systemPrompt = `You are a professional administrative assistant for Recall.ai.
Your job is to answer questions about the user's past meetings using the provided search context.

CRITICAL INSTRUCTIONS:
1. Base your answer strictly on the provided meeting context. Do not make up facts or extrapolate beyond what is explicitly stated in the segments.
2. If the context does not contain enough information to answer the question, state politely that the information could not be found in their past meetings.
3. Keep your response highly professional, structured, and easy to read (use clear lists and bullet points if presenting multi-step answers).
4. Be chronologically aware: if segments specify different dates, sequence your findings accurately based on those dates. Refer to meeting names directly (e.g. "During the 'Next.js Sync' on May 21st, Dave mentioned...").`

  const userPrompt = `Context from past meetings:
==================================
${context}
==================================

Question: ${query}

Provide a structured, accurate, and professional answer:`

  const completion = await nvidia.chat.completions.create({
    model: "meta/llama-3.1-70b-instruct",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.2,
  })

  // Assemble sources reference cards (deduplicating sources by meeting_id)
  const sourceMap = new Map<string, any>()
  for (const chunk of chunks) {
    if (!sourceMap.has(chunk.meeting_id) || chunk.similarity > sourceMap.get(chunk.meeting_id).similarity) {
      sourceMap.set(chunk.meeting_id, {
        meetingId: chunk.meeting_id,
        meetingName: chunk.meeting_name,
        date: chunk.meeting_created_at,
        meetingType: chunk.meeting_type,
        similarity: parseFloat(chunk.similarity.toFixed(3))
      })
    }
  }
  const sources = Array.from(sourceMap.values()).sort((a, b) => b.similarity - a.similarity)

  return NextResponse.json({
    answer: completion.choices[0].message.content || "Could not synthesize response.",
    sources
  })
}
