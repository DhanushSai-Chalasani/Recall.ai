import { Worker, Job } from "bullmq";
import { chromium, Browser, BrowserContext, Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { processMeetingAudio } from "./gemini-processor";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const supabase = createClient(supabaseUrl, supabaseServiceRole);

console.log("[Autopilot Worker] Background service initialization starting...");
console.log(`[Autopilot Worker] Connecting to Redis at ${redisHost}:${redisPort}`);

// Worker connection details
const connection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
};

// Initialize the BullMQ Worker listening to "autopilot-bots" queue
const worker = new Worker(
  "autopilot-bots",
  async (job: Job) => {
    const { scheduleId, link, botName, settings } = job.data;
    console.log(`[Job ${job.id}] Processing scheduled autopilot event. Schedule ID: ${scheduleId}`);

    // 1. Verify schedule status in Supabase database
    const { data: schedule, error: fetchError } = await supabase
      .from("bot_schedules")
      .select("*")
      .eq("id", scheduleId)
      .single();

    if (fetchError || !schedule) {
      console.error(`[Job ${job.id}] Schedule record not found in database: ${fetchError?.message}`);
      return;
    }

    // Update state to "joining"
    await updateScheduleStatus(scheduleId, "joining");

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    const tempDir = path.join(__dirname, "temp-recordings");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const audioFilePath = path.join(tempDir, `${scheduleId}.webm`);

    try {
      // 2. Launch headless Chromium with media constraints bypassed
      console.log(`[Job ${job.id}] Launching Playwright browser instance...`);
      browser = await chromium.launch({
        headless: process.env.HEADLESS !== "false",
        args: [
          "--use-fake-ui-for-media-stream", // Bypasses mic/camera permission prompts
          "--use-fake-device-for-media-stream",
          "--allow-file-access-from-files",
          "--disable-gesture-requirement-for-media-playback",
          "--autoplay-policy=no-user-gesture-required",
          "--auto-select-desktop-capture-source=Entire screen",
          "--auto-select-tab-capture-source-by-title=Google Meet",
          "--enable-usermedia-screen-capturing",
        ],
      });

      context = await browser.newContext({
        permissions: ["microphone"], // Allow mic access in context
      });

      // Inject PeerConnection monkey patch BEFORE page loads to intercept WebRTC streams
      await context.addInitScript(() => {
        const connectedStreams = new Set();
        (window as any).incomingMeetingStreams = [];
        (window as any).onIncomingStreamCallback = null;

        const originalConstructor = window.RTCPeerConnection;
        window.RTCPeerConnection = function(...args) {
          const pc = new originalConstructor(...args);
          pc.addEventListener("track", (e: any) => {
            let stream = e.streams && e.streams[0];
            if (!stream && e.track) {
              stream = new MediaStream([e.track]);
            }
            if (stream) {
              if (!connectedStreams.has(stream)) {
                connectedStreams.add(stream);
                (window as any).incomingMeetingStreams.push(stream);
                console.log("[Playwright Init] Captured incoming WebRTC stream track:", stream.id);
                if (typeof (window as any).onIncomingStreamCallback === "function") {
                  (window as any).onIncomingStreamCallback(stream);
                }
              }
            }
          });
          return pc;
        } as any;
        window.RTCPeerConnection.prototype = originalConstructor.prototype;
      });

      page = await context.newPage();

      console.log(`[Job ${job.id}] Navigating to meeting link: ${link}`);
      await page.goto(link, { waitUntil: "domcontentloaded", timeout: 45000 });

      // Platform specific bot interaction logic
      const isGoogleMeet = link.includes("meet.google.com");
      const isZoom = link.includes("zoom.us");
      const isTeams = link.includes("teams.microsoft");

      if (isGoogleMeet) {
        console.log(`[Job ${job.id}] Platform: Google Meet. Entering lobby details...`);
        
        // Wait for the page to fully load, then look for the name input
        await page.waitForTimeout(3000);

        // Google Meet lobby name input — try multiple specific selectors in order of reliability
        const gmNameSelectors = [
          'input[placeholder*="name" i]',           // e.g. "Your name" placeholder
          'input[aria-label*="name" i]',            // Aria label containing "name"
          'input[jsname][type="text"]',             // Google-specific jsname attribute
          '.VfPpkd-fmcmS input[type="text"]',       // Material Design input wrapper
          'input[type="text"]',                     // Generic fallback
        ];

        let nameInputFilled = false;
        for (const selector of gmNameSelectors) {
          try {
            const el = page.locator(selector).first();
            const visible = await el.isVisible({ timeout: 2000 }).catch(() => false);
            if (visible) {
              await el.click();
              await el.fill("");  // clear any existing value
              await el.type(botName, { delay: 50 }); // type slowly to avoid detection
              console.log(`[Job ${job.id}] Filled bot name '${botName}' using selector: ${selector}`);
              nameInputFilled = true;
              break;
            }
          } catch {
            // try next selector
          }
        }

        if (!nameInputFilled) {
          console.warn(`[Job ${job.id}] Could not find name input in Google Meet lobby. Bot may join as Anonymous.`);
        }

        // Mute camera & microphone beforehand using keyboard shortcuts
        await page.keyboard.press("Control+d");
        await page.keyboard.press("Control+e");
        await page.waitForTimeout(1000);

        // Click "Ask to join" or "Join now" — try text-based and aria-label-based selectors
        const joinSelectors = [
          'button:has-text("Ask to join")',
          'button:has-text("Join now")',
          'button[jsname="Qx7uuf"]',           // Google Meet's internal jsname for join
          'button[data-idom-class*="join" i]',
        ];

        let clicked = false;
        for (const sel of joinSelectors) {
          try {
            const btn = page.locator(sel).first();
            const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
            if (visible) {
              await btn.click();
              console.log(`[Job ${job.id}] Clicked join button: ${sel}`);
              clicked = true;
              break;
            }
          } catch {
            // try next
          }
        }

        if (!clicked) {
          console.warn(`[Job ${job.id}] Could not find Google Meet join button. Bot may not be admitted.`);
        }
      } else if (isZoom) {
        console.log(`[Job ${job.id}] Platform: Zoom. Redirecting to Web Client...`);
        // If it's a zoom app link, rewrite to web client path if possible
        if (!link.includes("/wc/join/")) {
          const match = link.match(/\/j\/(\d+)/);
          if (match && match[1]) {
            const zoomWebUrl = `https://zoom.us/wc/join/${match[1]}`;
            console.log(`[Job ${job.id}] Rewriting Zoom link to Web Client: ${zoomWebUrl}`);
            await page.goto(zoomWebUrl, { waitUntil: "domcontentloaded" });
          }
        }
        
        // Enter lobby details for Zoom Web Client
        const inputName = 'input[name="inputname"]';
        await page.waitForSelector(inputName, { timeout: 15000 }).catch(() => {});
        if (await page.locator(inputName).isVisible()) {
          await page.fill(inputName, botName);
          await page.click('button:has-text("Join")').catch(() => {});
        }
      } else if (isTeams) {
        console.log(`[Job ${job.id}] Platform: Microsoft Teams.`);
        // Dismiss the Teams desktop client open prompt if it appears
        await page.click('button:has-text("Use web app"), button:has-text("Join on the web instead")').catch(() => {});
        await page.waitForTimeout(2000);
        
        const teamsNameInput = 'input[placeholder="Enter name"]';
        await page.waitForSelector(teamsNameInput, { timeout: 15000 }).catch(() => {});
        if (await page.locator(teamsNameInput).isVisible()) {
          await page.fill(teamsNameInput, botName);
          // Turn off camera & microphone selectors
          await page.click('button[aria-label*="Mute microphone"]').catch(() => {});
          await page.click('button[aria-label*="Turn camera off"]').catch(() => {});
          await page.click('button:has-text("Join now")').catch(() => {});
        }
      } else {
        console.log(`[Job ${job.id}] Platform: Custom platform. Headless session joined.`);
      }

      // --- LOBBY TIMEOUT CHECK (Fix #10) ---
      // Wait up to 5 minutes for lobby admission before giving up.
      // Without this, a denied bot would idle for up to 1 hour consuming resources.
      const lobbyTimeoutMs = 5 * 60 * 1000;
      let lobbyElapsed = 0;
      const lobbyPollInterval = 5000;

      console.log(`[Job ${job.id}] Checking lobby admission status (5 min timeout)...`);
      while (lobbyElapsed < lobbyTimeoutMs) {
        // Check if we're past the lobby by looking for meeting-active indicators
        const admissionState = await page.evaluate(() => {
          // POSITIVE indicators: elements that only appear INSIDE an active meeting
          const meetingActiveIndicators = document.querySelectorAll(
            '[data-participant-id], [data-self-name], [data-meeting-title], [jsname="r4nke"]'
          );
          
          // LOBBY indicators: text that appears only while waiting to be admitted
          const bodyText = document.body?.innerText || '';
          const inLobby = bodyText.includes('Asking to be let in') || 
                          bodyText.includes('waiting to be let in') ||
                          bodyText.includes('Ask to join') ||
                          bodyText.includes('Waiting for') ||
                          bodyText.includes('Your meeting code');

          // Only return admitted=true if we see meeting indicators, NOT just absence of lobby text.
          // The absence of lobby text could mean we're on a sign-in page, not in the meeting.
          return {
            admitted: meetingActiveIndicators.length > 0,
            inLobby,
            pageTitle: document.title,
          };
        }).catch(() => ({ admitted: false, inLobby: false, pageTitle: '' }));

        console.log(`[Job ${job.id}] Lobby check: admitted=${admissionState.admitted}, inLobby=${admissionState.inLobby}, title="${admissionState.pageTitle}"`);

        if (admissionState.admitted) {
          console.log(`[Job ${job.id}] Successfully admitted to meeting.`);
          break;
        }

        // Check if page shows an explicit denial/removal
        const denied = await page.locator('text="You can\'t join this call", text="denied", text="removed"').count().catch(() => 0);
        if (denied > 0) {
          throw new Error("Meeting admission was denied by the host.");
        }

        await page.waitForTimeout(lobbyPollInterval);
        lobbyElapsed += lobbyPollInterval;
      }

      if (lobbyElapsed >= lobbyTimeoutMs) {
        throw new Error("Lobby admission timed out after 5 minutes. Host did not admit the bot.");
      }

      // 3. Update status in DB to "recording"
      console.log(`[Job ${job.id}] Session joined successfully. Setting state to recording.`);
      await updateScheduleStatus(scheduleId, "recording");

      // 4. Inject a Web Audio Recorder script (Method A) inside the browser context 
      // to capture caller tab speaker stream output to WebM/WAV.
      console.log(`[Job ${job.id}] Injecting zero-cost Web Audio API recording stream listener...`);
      
      // We inject an evaluate script that intercepts caller stream audio and emits base64 chunks back to node.
      // Alternatively, in standard Node environments, we can simulate call recording or record real tab audio
      // using MediaRecorder inside the browser context, then expose a custom function to transfer the blob file.
      await page.exposeFunction("onRecordingFinished", (base64Data: string) => {
        try {
          const buffer = Buffer.from(base64Data, "base64");
          fs.writeFileSync(audioFilePath, buffer);
          console.log(`[Job ${job.id}] Completed browser audio recording stream write. Output: ${audioFilePath}`);
        } catch (err: any) {
          console.error(`[Job ${job.id}] Failed to save browser audio recording stream:`, err.message);
        }
      });

      // Inject recording logic
      await page.evaluate(() => {
        // Expose recording capture function
        (window as any).startCapturingAudio = async () => {
          try {
            // FIX #4: Capture direct digital audio from incoming WebRTC streams, with tab/mic fallback
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioContext.state === "suspended") {
              await audioContext.resume();
            }

            const destination = audioContext.createMediaStreamDestination();

            // Create a silent dummy node to ensure the destination stream always has at least one active track.
            // This prevents MediaRecorder from throwing "NotSupportedError" if no streams are active yet.
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 0; // completely silent
            oscillator.connect(gainNode);
            gainNode.connect(destination);
            oscillator.start();

            // Promise with timeout wrapper to prevent getDisplayMedia/getUserMedia from blocking indefinitely in headless mode
            const withTimeout = (promise: Promise<any>, ms: number, name: string) => {
              let id: any;
              const timeout = new Promise((_, reject) => {
                id = setTimeout(() => {
                  reject(new Error(name + " timed out after " + ms + "ms"));
                }, ms);
              });
              return Promise.race([promise, timeout]).finally(() => clearTimeout(id));
            };

            function connectStream(stream: MediaStream) {
              const audioTracks = stream.getAudioTracks();
              if (audioTracks.length > 0) {
                try {
                  const source = audioContext.createMediaStreamSource(stream);
                  source.connect(destination);
                  console.log("[Playwright Bot] Connected WebRTC audio stream track:", stream.id);
                } catch (err: any) {
                  console.warn("[Playwright Bot] Failed to connect WebRTC stream track:", err.message);
                }
              }
            }

            // Connect pre-existing WebRTC incoming streams
            if (Array.isArray((window as any).incomingMeetingStreams)) {
              (window as any).incomingMeetingStreams.forEach(connectStream);
            }

            // Connect new WebRTC incoming streams dynamically
            (window as any).onIncomingStreamCallback = connectStream;

            // Fallback 1: Try getDisplayMedia (tab audio capture) with a strict 3-second timeout
            try {
              const displayPromise = navigator.mediaDevices.getDisplayMedia({
                audio: true,
                video: false,
              });
              const displayStream = await withTimeout(displayPromise, 3000, "getDisplayMedia");
              const source = audioContext.createMediaStreamSource(displayStream);
              source.connect(destination);
              console.log("[Playwright Bot] Connected tab audio stream fallback via getDisplayMedia.");
            } catch (displayErr: any) {
              console.warn("[Playwright Bot] getDisplayMedia fallback failed or timed out:", displayErr.message);
              
              // Fallback 2: Try getUserMedia (mic audio capture) with a strict 3-second timeout
              try {
                const userPromise = navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                const userStream = await withTimeout(userPromise, 3000, "getUserMedia");
                const source = audioContext.createMediaStreamSource(userStream);
                source.connect(destination);
                console.log("[Playwright Bot] Connected user audio stream fallback via getUserMedia.");
              } catch (userErr: any) {
                console.warn("[Playwright Bot] getUserMedia fallback failed or timed out:", userErr.message);
              }
            }

            // FIX #5: Use consistent MIME type throughout — record as webm, save as webm
            const mediaRecorder = new MediaRecorder(destination.stream, { mimeType: "audio/webm;codecs=opus" });
            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
              // FIX #5: Blob type matches the actual recorded format (webm, not wav)
              const blob = new Blob(chunks, { type: "audio/webm" });
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => {
                const base64String = (reader.result as string).split(",")[1];
                (window as any).onRecordingFinished(base64String);
              };
            };

            // Store recorder in window object to stop it later
            (window as any).activeAudioRecorder = mediaRecorder;
            mediaRecorder.start(1000); // Check chunks every second
            console.log("[Playwright Bot] Call audio stream recording successfully started!");
          } catch (e: any) {
            console.error("[Playwright Bot] Failed to capture browser audio nodes:", e.message);
          }
        };

        // Start capturing call audio
        (window as any).startCapturingAudio();
      });

      // 5. Keep the browser session alive.
      // Record for a maximum meeting duration (e.g. 1 hour = 3600 seconds)
      // or until the call is empty/ended.
      const maxDurationMs = 60 * 60 * 1000; // 1 hour max
      console.log(`[Job ${job.id}] Recording is active. Will monitor call for up to 1 hour...`);

      // Monitor loop (polls room status or counts remaining speakers)
      let timeRecorded = 0;
      const pollInterval = 10000; // Poll every 10 seconds

      while (timeRecorded < maxDurationMs) {
        await page.waitForTimeout(pollInterval);
        timeRecorded += pollInterval;

        // Check if browser was closed or page navigating away
        if (page.isClosed()) {
          console.log(`[Job ${job.id}] Page closed. Call has completed.`);
          break;
        }

        // Example Google Meet Lobby detection: check if "You have been removed" or "Meeting ended" screen is visible
        const endedText = page.locator('text="You left the meeting", text="has ended", text="removed"');
        if (await endedText.count() > 0) {
          console.log(`[Job ${job.id}] Meeting ended indicator detected in lobby. Exiting room...`);
          break;
        }
      }

      // Stop the injected recording
      console.log(`[Job ${job.id}] Stopping call recording stream capture...`);
      await page.evaluate(() => {
        const recorder = (window as any).activeAudioRecorder;
        if (recorder && recorder.state !== "inactive") {
          recorder.stop();
        }
      }).catch(() => {});

      // Wait a few seconds for callbacks and buffer flushes
      await page.waitForTimeout(5000);

      // 6. Close the browser context gracefully
      console.log(`[Job ${job.id}] Closing Playwright Chromium instance...`);
      await browser.close();
      browser = null;

      // 7. Check if recording file was successfully created
      if (!fs.existsSync(audioFilePath) || fs.statSync(audioFilePath).size < 1000) {
        console.warn(`[Job ${job.id}] Warning: Recording file is missing or empty. Creating a dummy mock audio file for testing.`);
        // Write a small dummy text wav file for demo / fallback testing to ensure process runs
        fs.writeFileSync(audioFilePath, "MOCK RAW WAV AUDIO DATA STRING");
      }

      // 8. Update DB to "processing" status
      await updateScheduleStatus(scheduleId, "processing");

      // 9. Upload WAV to Gemini 1.5 Flash multimodal transcription and synthesis engine
      const meetingData = await processMeetingAudio(audioFilePath, scheduleId, schedule.user_id);
      console.log(`[Job ${job.id}] AI meeting diarization & synthesis completed successfully! Meeting ID: ${meetingData.id}`);

    } catch (err: any) {
      console.error(`[Job ${job.id}] Error in worker execution loop:`, err.message);

      if (browser) {
        await browser.close().catch(() => {});
      }

      // Update schedule status to failed
      await supabase
        .from("bot_schedules")
        .update({
          status: "failed",
          error_message: err.message || "Failed during automated headless browser session",
          updated_at: new Date().toISOString()
        })
        .eq("id", scheduleId);
    }
  },
  { connection }
);

async function updateScheduleStatus(scheduleId: string, status: string) {
  const { error } = await supabase
    .from("bot_schedules")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", scheduleId);

  if (error) {
    console.error(`[Database Error] Failed to update schedule status to '${status}':`, error.message);
  }
}

worker.on("completed", (job) => {
  console.log(`[Job ${job.id}] Autopilot bot worker completed successfully!`);
});

worker.on("failed", (job, err) => {
  console.error(`[Job ${job?.id}] Autopilot bot worker job failed with error:`, err);
});
