const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔐 VERIFY TOKEN
const VERIFY_TOKEN = "myverifytoken";

// 🔑 ENV VARIABLES
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

// ⚠️ CHECK ENV VARIABLES
if (!ACCESS_TOKEN || !PHONE_NUMBER_ID || !HUGGINGFACE_API_KEY) {
  console.error("❌ Missing environment variables!");
}

// 🤖 AI FUNCTION (FIXED & STABLE)
async function askAI(message) {
  const url = "https://api-inference.huggingface.co/models/google/flan-t5-base";

  if (!HUGGINGFACE_API_KEY) {
    return "❌ AI not configured properly.";
  }

  for (let i = 0; i < 3; i++) {
    try {
      const response = await axios.post(
        url,
        {
          inputs: `Explain this clearly like a teacher to a secondary school student:\n${message}`
        },
        {
          headers: {
            Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 15000
        }
      );

      const data = response.data;

      // ✅ SUCCESS
      if (Array.isArray(data) && data[0]?.generated_text) {
        return data[0].generated_text.trim().substring(0, 1500);
      }

      // ⏳ MODEL LOADING
      if (data.error && data.error.toLowerCase().includes("loading")) {
        console.log("⏳ Model loading... retrying");
        await new Promise(res => setTimeout(res, 4000));
        continue;
      }

      console.log("⚠️ Unexpected response:", data);
      return "⚠️ AI returned an unexpected result.";

    } catch (error) {
      console.error("🔥 HF ERROR:", error.response?.data || error.message);
      await new Promise(res => setTimeout(res, 3000));
    }
  }

  return "❌ AI is busy right now. Try again shortly.";
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

    if (!message) return res.sendStatus(200);

    const from = message.from;

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

    // 📘 EXAM
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

    // 🧠 AI
    else {
      reply = await askAI(text);
    }

    await sendMessage(from, reply);

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ SERVER ERROR:", error.response?.data || error.message);
    res.sendStatus(200);
  }
});

// 📤 SEND MESSAGE
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
        }
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
