const express = require("express");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// 🔐 VERIFY TOKEN (must match Meta dashboard)
const VERIFY_TOKEN = "myverifytoken";

// 🔑 ENV VARIABLES (SET THESE IN RENDER)
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ⚠️ CHECK IF TOKENS EXIST
if (!ACCESS_TOKEN || !PHONE_NUMBER_ID || !GEMINI_API_KEY) {
  console.error("❌ Missing environment variables!");
}

// 🤖 GEMINI SETUP
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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

// 🤖 AI FUNCTION
async function askAI(message) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const result = await model.generateContent(
      `You are Classify AI, a tutor for WAEC, NECO, and JAMB students.
Explain clearly and simply.

Question: ${message}`
    );

    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error("❌ GEMINI ERROR:", error);
    return "⚠️ AI is not responding right now. Try again later.";
  }
}

// 🤖 HANDLE MESSAGES
app.post("/webhook", async (req, res) => {
  console.log("🔥 WEBHOOK HIT");

  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    // Ignore non-message events
    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;

    const text =
      message.type === "text"
        ? message.text.body.toLowerCase().trim()
        : "";

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
1️⃣ Answer past questions  
2️⃣ Explain answers step-by-step  
3️⃣ Set practice questions  
4️⃣ Help you understand difficult topics  

👉 Type:
- WAEC  
- NECO  
- JAMB  

Or send your question directly.`;
    }

    // 📘 EXAM SELECTION
    else if (text.includes("waec")) {
      reply = "📘 WAEC selected. Send your question or type 'set question'.";
    }
    else if (text.includes("neco")) {
      reply = "📗 NECO selected. Send your question or type 'set question'.";
    }
    else if (text.includes("jamb")) {
      reply = "📙 JAMB selected. Send your question or type 'set question'.";
    }

    // 📝 SET QUESTIONS FEATURE
    else if (text.includes("set question")) {
      reply = `📝 Practice Question:

What is the value of x in the equation:
2x + 5 = 15?

A. 3  
B. 5  
C. 10  
D. 15  

👉 Reply with your answer (A, B, C, or D)`;
    }

    // 🧠 GEMINI AI RESPONSE
    else {
      reply = await askAI(text);
    }

    // 📤 SEND MESSAGE TO WHATSAPP
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply }
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Message sent:", response.data);

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ ERROR DETAILS:", error);
    res.sendStatus(500);
  }
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
