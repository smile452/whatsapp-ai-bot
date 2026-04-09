const express = require("express");
const app = express();

app.use(express.json());

const VERIFY_TOKEN = "myverifytoken";

// ✅ Webhook verification (KEEP AS IS)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verified!");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ✅ Receive messages from WhatsApp
app.post("/webhook", (req, res) => {
  const body = req.body;

  try {
    // Check if this is a WhatsApp message event
    if (body.entry && body.entry[0].changes) {
      const change = body.entry[0].changes[0];
      const value = change.value;

      if (value.messages) {
        const message = value.messages[0];
        const text = message.text?.body;

        console.log("User said:", text);
      } else {
        console.log("No message inside (maybe status update)");
      }
    } else {
      console.log("Unknown event:", body);
    }

  } catch (error) {
    console.error("Error processing message:", error.message);
  }

  res.sendStatus(200);
});

// ✅ IMPORTANT: Use Render port (fix)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
