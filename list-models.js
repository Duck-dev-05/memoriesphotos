const requireDotEnv = require('dotenv');
requireDotEnv.config({ path: '.env.local' });
requireDotEnv.config({ path: '.env' });

async function run() {
  const groqKey = process.env.GROQ_API_KEY;
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { "Authorization": `Bearer ${groqKey}` }
  });
  const data = await res.json();
  console.log(data.data.map(m => m.id));
}
run();
