require("dotenv").config();
const express = require("express");
const OpenAI = require("openai");
const axios = require("axios");
const pdf = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Load API key from .env
});

// Temporary storage for extracted PDF content
let extractedText = "";

// Handle incoming messages from Google Chat
app.post("/", async (req, res) => {
  const message = req.body.message?.text || "";
  const attachment = req.body.message?.attachment || null;

  console.log("Received message:", message);

  if (attachment) {
    try {
      const fileUrl = attachment.downloadUri; // URL to download the file
      const fileName = path.join(__dirname, "temp.pdf");

      // Download the PDF file
      const response = await axios.get(fileUrl, {
        responseType: "arraybuffer",
      });
      fs.writeFileSync(fileName, response.data);

      // Extract text from the PDF
      const pdfData = await pdf(fs.readFileSync(fileName));
      extractedText = pdfData.text || "No readable content found in the PDF.";

      // Cleanup: Remove the temp file
      fs.unlinkSync(fileName);

      res.json({
        text: "PDF processed successfully. Ask me questions about it!",
      });
      return;
    } catch (error) {
      console.error("Error processing attachment:", error);
      res.json({ text: "Failed to process the PDF file." });
      return;
    }
  }

  if (!message) {
    res.json({ text: "Send me a message or attach a PDF file." });
    return;
  }

  try {
    // Use extracted PDF content as context for OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant. Use the provided document content to answer questions.",
        },
        { role: "user", content: `Document Content: ${extractedText}` },
        { role: "user", content: message },
      ],
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
