require("dotenv").config();
const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure API key is securely loaded from .env
});

// Handle incoming messages from Google Chat
app.post("/", async (req, res) => {
  const message = req.body.message?.text || "Hello!";
  console.log("Received message:", message);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      store: true,
      messages: [{ role: "user", content: message }],
    });

    const reply = response.choices[0].message.content;
    console.log("Replying:", reply);

    res.json({ text: reply });
  } catch (error) {
    console.error("Error:", error);
    res.json({ text: "Error processing request." });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
