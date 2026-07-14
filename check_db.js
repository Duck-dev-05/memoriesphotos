const { createClient } = require('@libsql/client');

const client = createClient({
  url: "libsql://memories-db-minhd.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODAzOTYzOTUsImlkIjoiMDE5ZTg3ZTEtYzAwMS03MDEyLTkxZWMtMzk2ODJiODNhMDhlIiwicmlkIjoiYjVjYmE2MzktMTIzOS00MmIxLWE5YjQtNzYzZGQxZGIxNjE4In0.W4PwJv_aemDW6PqXxKaUgnIROAiwuzE8ccbK9r6LCsHeZBHAOGRaM-kNMMP-VHGkYIV1qYEIL1K0Sf1hH5xsCQ"
});

async function run() {
  try {
    const users = await client.execute("SELECT id, email, name FROM User");
    console.log("Users:", users.rows);

    const albums = await client.execute("SELECT id, name, userId FROM Album");
    console.log("Albums:", albums.rows);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
