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
  apiKey: process.env.OPENAI_API_KEY, // Ensure API key is loaded from .env
});

// Temporary storage for extracted PDF content
let extractedText = "";

// Handle incoming messages from Google Chat
app.post("/", async (req, res) => {
  console.log("Received request:", JSON.stringify(req.body, null, 2));

  const message = req.body.message?.text || "";
  const attachment = req.body.message?.attachment || null;

  console.log("Received message:", message);

  // Handle PDF attachment
  if (attachment) {
    try {
      console.log("Attachment detected:", attachment);

      const fileUrl = attachment.downloadUri;
      if (!fileUrl) {
        return res.json({ text: "Attachment URL missing." });
      }

      console.log("Downloading PDF from:", fileUrl);

      // Download the PDF
      const fileResponse = await axios({
        url: fileUrl,
        method: "GET",
        responseType: "arraybuffer",
      });

      const filePath = path.join(__dirname, "temp.pdf");
      fs.writeFileSync(filePath, Buffer.from(fileResponse.data));

      console.log("PDF downloaded, extracting text...");

      // Extract text from the PDF
      const pdfData = await pdf(fs.readFileSync(filePath));
      extractedText = pdfData.text || "No readable content found in the PDF.";

      // Cleanup temp file
      fs.unlinkSync(filePath);
      console.log("PDF processed successfully.");

      res.json({
        text: "PDF processed successfully. Ask me questions about it!",
      });
      return;
    } catch (error) {
      console.error("Error processing attachment:", error.message);
      res.json({ text: `Failed to process the PDF file: ${error.message}` });
      return;
    }
  }

  // Handle text messages
  if (!message) {
    res.json({ text: "Send me a message or attach a PDF file." });
    return;
  }

  try {
    console.log("Generating AI response...");

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
    console.error("Error:", error.message);
    res.json({ text: "Error processing request." });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
