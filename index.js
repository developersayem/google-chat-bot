require("dotenv").config();
const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");
const pdf = require("pdf-parse");
const fs = require("fs");

const app = express();
app.use(express.json());

// Set up multer for file upload
const upload = multer({ dest: "uploads/" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure API key is securely loaded from .env
});

// Handle incoming messages from Google Chat (text and PDF)
app.post("/", upload.single("pdfFile"), async (req, res) => {
  let message = req.body.message?.text || "Hello!";

  // Check if a PDF file was uploaded
  if (req.file) {
    try {
      // Read and parse the uploaded PDF file
      const pdfData = fs.readFileSync(req.file.path);
      const data = await pdf(pdfData);

      // Extract text from the PDF
      message = data.text || "No text found in PDF.";
      console.log("Extracted text from PDF:", message);
    } catch (error) {
      console.error("Error reading or parsing PDF:", error);
      return res.json({ text: "Error processing PDF file." });
    }
  }

  // Use OpenAI API to generate a response based on the message (text or PDF content)
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
