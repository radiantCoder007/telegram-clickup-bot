import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ===== ASSIGNEE MAPPING =====
const ASSIGNEE_MAP = {
  "Affan": 10217346,
  "Tareq": 68524659
};

// ===== ENV VARIABLES =====
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME; // without @
const CLICKUP_TOKEN = process.env.CLICKUP_TOKEN;
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID;

// ===== TELEGRAM SEND =====
async function sendTelegramMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });
}

// ===== CLICKUP CREATE TASK =====
async function createClickUpTask(name, assignees = []) {
  const payload = { name };

  if (assignees.length) {
    payload.assignees = assignees;
  }

  const res = await fetch(
    `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task`,
    {
      method: "POST",
      headers: {
        Authorization: CLICKUP_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  return res.json();
}

// ===== WEBHOOK =====
app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  if (!message) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text;

  if (!text) return res.sendStatus(200);

  const cmd1 = "/bot ";
  const cmd2 = TELEGRAM_BOT_USERNAME
    ? `/bot@${TELEGRAM_BOT_USERNAME} `
    : null;

  const isCmd =
    text.startsWith(cmd1) ||
    (cmd2 && text.startsWith(cmd2));

  if (!isCmd) {
    return res.sendStatus(200);
  }

  // Extract text after command
  let taskText = text.startsWith(cmd1)
    ? text.slice(cmd1.length).trim()
    : text.slice(cmd2.length).trim();

  if (!taskText) {
    await sendTelegramMessage(chatId, "Write like: /bot Fix bug @Affan");
    return res.sendStatus(200);
  }

  let assignees = [];

  // Detect @Name
  const mentionMatch = taskText.match(/@(\w+)/);

  if (mentionMatch) {
    const mentionedName = mentionMatch[1];

    if (ASSIGNEE_MAP[mentionedName]) {
      assignees = [ASSIGNEE_MAP[mentionedName]];
    }

    // Remove @mention from title
    taskText = taskText.replace(/@\w+/, "").trim();
  }

  try {
    const task = await createClickUpTask(taskText, assignees);

    if (assignees.length) {
      await sendTelegramMessage(chatId, "Task created + assigned ✅");
    } else {
      await sendTelegramMessage(chatId, "Task created ✅");
    }
  } catch (e) {
    await sendTelegramMessage(chatId, "Error creating task ❌");
  }

  return res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Bot running");
});

app.listen(3000);
