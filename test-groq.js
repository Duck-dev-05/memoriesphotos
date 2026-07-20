const requireDotEnv = require('dotenv');
requireDotEnv.config({ path: '.env.local' });
requireDotEnv.config({ path: '.env' });

async function run() {
  console.log("Starting Groq test...");
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
        console.error("No GROQ_API_KEY found in .env or .env.local!");
        return;
    }

    const buffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"); // 1x1 transparent png
    console.log("Buffer created, fetching from Groq...");
    
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.2-90b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image and provide exactly 5 relevant keywords/tags." },
              { type: "image_url", image_url: { url: `data:image/png;base64,${buffer.toString("base64")}` } }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 50
      })
    });
    
    const data = await res.json();
    if (!res.ok) {
        console.error("Error from Groq API:", data);
        return;
    }
    
    console.log("Response:", data.choices?.[0]?.message?.content);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
