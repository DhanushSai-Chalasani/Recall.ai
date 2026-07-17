const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');
const OpenAI = require('openai');

async function testSupabase() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    console.log("Supabase URL:", supabaseUrl);
    if (!supabaseUrl || !supabaseKey) {
      console.log("Supabase credentials missing.");
      return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('meetings').select('id').limit(1);
    if (error) {
      console.log("Supabase query error:", error.message);
    } else {
      console.log("Supabase connection successful. Query result:", data);
    }
  } catch (e) {
    console.error("Supabase exception:", e);
  }
}

async function testGroq() {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      console.log("Groq API key missing.");
      return;
    }
    const groq = new Groq({ apiKey: groqKey });
    const models = await groq.models.list();
    console.log("Groq connection successful. Models count:", models.data.length);
  } catch (e) {
    console.error("Groq error:", e.message || e);
  }
}

async function testNvidia() {
  try {
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    if (!nvidiaKey) {
      console.log("NVIDIA API key missing.");
      return;
    }
    const nvidia = new OpenAI({
      apiKey: nvidiaKey,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });
    const completion = await nvidia.chat.completions.create({
      model: "meta/llama-3.1-70b-instruct",
      messages: [{ role: "user", content: "Hello, reply with only one word: success." }],
      max_tokens: 5
    });
    console.log("NVIDIA connection successful. Response:", completion.choices[0].message.content.trim());
  } catch (e) {
    console.error("NVIDIA error:", e.message || e);
  }
}

async function run() {
  console.log("Testing Supabase...");
  await testSupabase();
  console.log("\nTesting Groq...");
  await testGroq();
  console.log("\nTesting NVIDIA...");
  await testNvidia();
}

run();
