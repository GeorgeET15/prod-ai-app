import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

// ----------------------------
// Environment
// ----------------------------
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const FLASK_SERVER = "http://localhost:5000"; // Change if deployed
const PROJECT_ID = "413a2d98-63e8-4bd2-8543-5d69ebd9fe06";
const CHAT_ENDPOINT = `${FLASK_SERVER}/chat`;
const REALTIME_ENDPOINT = `${FLASK_SERVER}/realtime-message`;

// ----------------------------
// Test Flask Connectivity
// ----------------------------
async function testFlaskConnection() {
  try {
    const res = await axios.get(`${FLASK_SERVER}/test`, { timeout: 5000 });
    console.log("✅ Flask server test response:", res.data);
  } catch (e) {
    console.error("❌ Flask server test failed:", {
      message: e.message,
      status: e.response?.status,
      data: e.response?.data,
    });
  }
}
testFlaskConnection();

// ----------------------------
// Supabase + Telegram setup
// ----------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// ----------------------------
// Helpers
// ----------------------------
async function broadcast(message) {
  console.log("🔔 Broadcasting message...");
  const { data: subs, error } = await supabase
    .from("subscribers")
    .select("chat_id");
  if (error) {
    console.error("❌ Error fetching subscribers:", error.message);
    return;
  }
  if (!subs || subs.length === 0) {
    console.log("⚠️ No subscribers found.");
    return;
  }

  console.log(`📤 Sending update to ${subs.length} subscribers...`);
  for (const row of subs) {
    try {
      await bot.sendMessage(row.chat_id, message); // plain text only
      console.log(`✅ Sent to chat_id=${row.chat_id}`);
    } catch (e) {
      console.error(`❌ Error sending to ${row.chat_id}:`, e.message);
    }
  }
}

// ----------------------------
// Telegram Handlers
// ----------------------------
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  console.log(`📥 /start received from chat_id=${chatId}`);
  const { error } = await supabase
    .from("subscribers")
    .upsert({ chat_id: chatId });
  if (error) {
    console.error("❌ Error saving subscriber:", error.message);
  } else {
    console.log(`✅ Subscriber saved: chat_id=${chatId}`);
  }
  bot.sendMessage(
    chatId,
    "👋 Hi! I’m PODAI — your Production Assistant.\n✅ You are subscribed to project updates."
  );
});

bot.on("message", async (msg) => {
  if (msg.text.startsWith("/start")) return;
  const chatId = msg.chat.id;
  console.log(`💬 Message from chat_id=${chatId}: "${msg.text}"`);

  try {
    const payload = { message: msg.text, project_id: PROJECT_ID };
    console.log("➡️ Sending payload to Flask backend:", payload);
    const res = await axios.post(CHAT_ENDPOINT, payload, { timeout: 15000 });
    const reply = res.data.reply || "⚠️ No response from AI.";
    console.log("⬅️ Response from backend:", reply);
    bot.sendMessage(chatId, reply); // plain text
  } catch (e) {
    console.error("❌ Error in handle_message:", {
      message: e.message,
      status: e.response?.status,
      data: e.response?.data,
    });
    bot.sendMessage(chatId, "⚠️ Something went wrong.");
  }
});

// ----------------------------
// Supabase Realtime Listeners
// ----------------------------
const tables = [
  "attendance",
  "budgets",
  "crew",
  "dailies",
  "deliverables",
  "departments",
  "equipment",
  "invoices",
  "locations",
  "milestones",
  "payroll",
  "projects",
  "schedules",
];

tables.forEach((t) => {
  console.log(`🔌 Subscribing to realtime changes on table=${t}`);
  supabase
    .channel(`${t}-changes`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: t },
      async (payload) => {
        console.log(
          `📡 Realtime event received from table=${t}:`,
          JSON.stringify(payload, null, 2)
        );

        try {
          const requestPayload = {
            table: t,
            eventType: payload.eventType,
            new: payload.new || {},
            old: payload.old || {},
          };
          console.log(
            "➡️ Sending payload to /realtime-message:",
            JSON.stringify(requestPayload, null, 2)
          );

          // Retry logic for axios request
          let lastError = null;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const res = await axios.post(REALTIME_ENDPOINT, requestPayload, {
                timeout: 60000, // Increased to 60 seconds
                headers: { "Content-Type": "application/json" },
              });
              console.log(
                "🔎 Flask /realtime-message response:",
                JSON.stringify(res.data, null, 2)
              );
              const summary =
                res.data && res.data.message
                  ? res.data.message
                  : "⚠️ No summary available.";
              console.log(`📝 Summary for ${t}: ${summary}`);
              broadcast(`📢 ${summary}`);
              return; // Success, exit retry loop
            } catch (err) {
              lastError = err;
              console.warn(`⚠️ Attempt ${attempt} failed:`, {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data,
              });
              if (attempt < 3) {
                console.log(`⏳ Retrying in 2 seconds...`);
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
            }
          }
          // All retries failed
          throw lastError;
        } catch (err) {
          console.error("❌ Error calling /realtime-message:", {
            message: err.message,
            status: err.response?.status,
            data: err.response?.data,
            stack: err.stack,
          });
          const fallback = `${t} ${payload.eventType.toLowerCase()}`;
          console.log(`↩️ Using fallback summary: ${fallback}`);
          // Improved fallback message
          let message = `📢 ${t} ${payload.eventType.toLowerCase()}`;
          if (payload.eventType === "INSERT" && payload.new?.id) {
            const vendor = payload.new?.vendor || "unknown vendor";
            const amount = payload.new?.amount
              ? ` for ₹${payload.new.amount.toLocaleString()}`
              : "";
            message += `: New invoice from ${vendor}${amount} added (ID: ${payload.new.id}).`;
          } else if (payload.eventType === "DELETE" && payload.old?.id) {
            message += `: Deleted an invoice with ID ${payload.old.id}.`;
          } else {
            message += `: ${payload.eventType.toLowerCase()} event occurred.`;
          }
          broadcast(message);
        }
      }
    )
    .subscribe((status) => {
      console.log(`ℹ️ Channel for table=${t} status: ${status}`);
    });
});

console.log("🤖 Telegram bot + realtime listener running...");
