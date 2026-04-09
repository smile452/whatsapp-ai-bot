const express = require("express");
const axios = require("axios");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = "myverifytoken";

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ✅ VERIFY WEBHOOK
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 🤖 HANDLE MESSAGES
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message) {
      const from = message.from;

      const text = message.text && message.text.body
        ? message.text.body.toLowerCase()
        : "";

      console.log("User says:", text);

      let reply = "";

      // 👋 GREETING
      if (["hi", "hello", "hey"].includes(text)) {
        reply = `🤖 Hello! Welcome to Classify AI 📚

I’m your smart study assistant designed to help students succeed in:

✅ WAEC  
✅ NECO  
✅ JAMB  

I can:
1️⃣ Answer past questions  
2️⃣ Explain answers step-by-step  
3️⃣ Set practice questions for you  
4️⃣ Help you understand difficult topics  

💬 Send me your question or type:
- "WAEC"
- "NECO"
- "JAMB"`;
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

      // 🧠 AI RESPONSE
      else {
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `You are Classify AI, an educational assistant for Nigerian students.
Explain answers clearly and simply for WAEC, NECO, and JAMB students.`
            },
            {
              role: "user",
              content: text
            }
          ]
        });

        reply = aiResponse.choices[0].message.content;
      }

      // 📤 SEND MESSAGE
      await axios.post(
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
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
