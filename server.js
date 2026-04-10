const express = require("express");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// 🔐 VERIFY TOKEN
const VERIFY_TOKEN = "myverifytoken";

// 🔑 ENV VARIABLES
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ⚠️ CHECK ENV VARIABLES
if (!ACCESS_TOKEN || !PHONE_NUMBER_ID || !GEMINI_API_KEY) {
  console.error("❌ Missing environment variables!");
}

// 🤖 GEMINI SETUP
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 🤖 AI FUNCTION (STABLE VERSION)
async function askAI(message) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are Classify AI, a helpful tutor for WAEC, NECO, and JAMB students.
Explain answers clearly and simply.

Question: ${message}`
            }
          ]
        }
      ]
    });

    const text = result?.response?.text();

    if (!text) {
      return "⚠️ AI didn't return a response. Try again.";
    }

    return text.substring(0, 1500); // prevent very long replies

  } catch (error) {
    console.error("🔥 GEMINI ERROR:", error.message);
    return "❌ AI is currently busy. Please try again.";
  }
}

// ✅ VERIFY WEBHOOK
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// 🤖 HANDLE MESSAGES
app.post("/webhook", async (req, res) => {
  console.log("🔥 WEBHOOK HIT");

  try {
    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;

    // ✅ ONLY HANDLE TEXT
    if (message.type !== "text") {
      await sendMessage(from, "⚠️ Please send a text message.");
      return res.sendStatus(200);
    }

    const text = message.text.body.trim().toLowerCase();

    console.log("📩 User says:", text);

    let reply = "";

    // 👋 GREETING
    if (["hi", "hello", "hey", "good morning", "good afternoon"].includes(text)) {
      reply = `🤖 Hello! Welcome to Classify AI 📚

I’m your smart study assistant.

I can help you with:

✅ WAEC  
✅ NECO  
✅ JAMB  

💡 What I can do:
1️⃣ Answer questions  
2️⃣ Explain answers  
3️⃣ Set practice questions  
4️⃣ Teach difficult topics  

👉 Type WAEC, NECO, or JAMB  
Or send your question directly.`;
    }

    // 📘 EXAM SELECTION
    else if (text.includes("waec")) {
      reply = "📘 WAEC selected. Send your question.";
    }
    else if (text.includes("neco")) {
      reply = "📗 NECO selected. Send your question.";
    }
    else if (text.includes("jamb")) {
      reply = "📙 JAMB selected. Send your question.";
    }

    // 📝 PRACTICE
    else if (text.includes("set question")) {
      reply = `📝 Practice Question:

2x + 5 = 15

A. 3  
B. 5  
C. 10  
D. 15  

👉 Reply with A, B, C, or D`;
    }

    // 🧠 AI RESPONSE
    else {
      reply = await askAI(text);
    }

    await sendMessage(from, reply);

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ SERVER ERROR:", error.response?.data || error.message);
    res.sendStatus(200); // prevent WhatsApp retries
  }
});

// 📤 SEND MESSAGE FUNCTION (CLEAN)
async function sendMessage(to, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    console.log("✅ Message sent");

  } catch (error) {
    console.error("❌ SEND ERROR:", error.response?.data || error.message);
  }
}

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
