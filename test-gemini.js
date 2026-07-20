const { GoogleGenAI } = require("@google/genai");
require('dotenv').config({ path: '.env' });

async function run() {
  console.log("Starting test...");
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const buffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"); // 1x1 transparent png
    console.log("Buffer created");
    
    const response = await ai.models.generateContent({
      model: 'gemini-pro-latest',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Analyze this image and provide exactly 5 relevant keywords/tags.' },
            { inlineData: { data: buffer.toString("base64"), mimeType: "image/png" } }
          ]
        }
      ]
    });
    console.log("Response:", response.text);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
