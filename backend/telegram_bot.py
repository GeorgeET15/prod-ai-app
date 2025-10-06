import logging
import requests
import os
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters
from dotenv import load_dotenv

# ----------------------------
# Load environment
# ----------------------------
load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Flask backend endpoints
FLASK_SERVER = "http://localhost:5000"   # Change if deployed
PROJECT_ID = "413a2d98-63e8-4bd2-8543-5d69ebd9fe06"  # Replace with actual project id
CHAT_ENDPOINT = f"{FLASK_SERVER}/chat"

# ----------------------------
# Logging
# ----------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ----------------------------
# Command Handlers
# ----------------------------
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text="👋 Hi! I’m PODAI — your Production Assistant.\nAsk me about budgets, schedules, or risks anytime."
    )

# ----------------------------
# Message Handler
# ----------------------------
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_message = update.message.text
    chat_id = update.message.chat_id

    try:
        payload = {
            "message": user_message,
            "project_id": PROJECT_ID
        }

        response = requests.post(CHAT_ENDPOINT, json=payload, timeout=15)

        if response.status_code == 200:
            reply = response.json().get("reply", "⚠️ No response from AI.")
        else:
            reply = f"❌ Error {response.status_code}: Couldn’t reach AI."

        await context.bot.send_message(chat_id=chat_id, text=reply)

    except Exception as e:
        logger.error(f"Error in handle_message: {e}")
        await context.bot.send_message(chat_id=chat_id, text="⚠️ Something went wrong.")

# ----------------------------
# Main
# ----------------------------
def main():
    app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("🤖 Telegram bot running...")
    app.run_polling()

if __name__ == "__main__":
    main()
