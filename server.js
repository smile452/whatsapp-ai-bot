const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔑 CONFIG (YOUR REAL VALUES)
const VERIFY_TOKEN = "myverifytoken";
const ACCESS_TOKEN = "EAANbQebo13MBRIXnDEXCybEcF5yNwtuwRL0ebJagfNurBn3IXqziV2ZCgC85YPZCF1wJA4tkZB8TpuDPOXCiyHMViofX6BQlpEx8ZBuM9qrottDBgtZB0ZBVZBKoxZCQOfo38LSrhHLiygQzON7mMH50AIwKP5V6mLNe0t8tXGYZCvcflj14i5nClGhZBrp0LbNXQRLtVauEI3cdMfEfRcqn0ynZC1p3rMtxyxU8uV9eKIzm44clFWzbE2VxxRiXCsfOepnwGIeDteE7HC3fDvJJ0ZA8ToGz";
const PHONE_NUMBER_ID = "1042701108929255";

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

// ✅ MAIN BOT LOGIC
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body.entry && body.entry[0].changes) {
      const change = body.entry[0].changes[0];
      const value = change.value;

      if (value.messages) {
        const message = value.messages[0];
        const from = message.from;
        const text = message.text?.body?.toLowerCase();

        let reply = "🤖 I didn’t understand. Try asking a question.";

        // 🟢 GREETING
        if (text.includes("hi") || text.includes("hello") || text.includes("hey")) {
          reply = `🤖 Hello! Welcome to Classify AI 📚

I’m your smart study assistant designed to help students succeed in exams like:

✅ WAEC  
✅ NECO  
✅ JAMB  

I can:
1. Answer past questions  
2. Explain answers step-by-step  
3. Set practice questions  
4. Help you understand difficult topics  

💬 Try:
- Give me JAMB math questions
- Explain photosynthesis
- Teach me algebra`;
        }

        // 🟡 QUESTIONS
        else if (text.includes("question") || text.includes("jamb") || text.includes("waec") || text.includes("neco")) {
          reply = `📘 Practice Questions

1. Solve: 3x + 6 = 12  
A. 2  
B. 3  
C. 4  
D. 6  

2. What is √25?  
A. 3  
B. 4  
C. 5  
D. 6  

Reply with answers (e.g., 1A, 2C)`;
        }

        // 🔵 EXPLANATION
        else if (text.includes("explain question")) {
          reply = `📖 Explanation:

3x + 6 = 12  
Subtract 6:

3x = 6  

Divide by 3:

x = 2 ✅  

Correct answer: A`;
        }

        // 🟣 TEACHING MODE
        else if (text.includes("photosynthesis")) {
          reply = `🌿 Photosynthesis Explained:

Photosynthesis is how plants make food using sunlight.

They take in water and carbon dioxide and produce glucose (food) and oxygen.

Simple: Plants use sunlight to make food 🌞`;
        }

        // 🔥 SEND MESSAGE
        await axios.post(
          `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: from,
            text: { body: reply },
          },
          {
            headers: {
              Authorization: `Bearer ${ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }

  res.sendStatus(200);
});

// ✅ PORT FOR RENDER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
