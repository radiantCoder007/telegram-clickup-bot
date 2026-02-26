import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CLICKUP_TOKEN = process.env.CLICKUP_TOKEN;
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID;

function parseMessage(text) {
  return { name: text };
}

async function sendTelegramMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

async function createClickUpTask(name) {
  const res = await fetch(`https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task`, {
    method: "POST",
    headers: {
      Authorization: CLICKUP_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name })
  });

  return res.json();
}

app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  if (!message) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text;

  if (!text) return res.sendStatus(200);

  try {
    const task = await createClickUpTask(text);
    await sendTelegramMessage(chatId, "Task created ✅");
  } catch (e) {
    await sendTelegramMessage(chatId, "Error creating task ❌");
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Bot running");
});

app.listen(3000);
