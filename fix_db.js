const { createClient } = require('@libsql/client');

const client = createClient({
  url: "libsql://memories-db-minhd.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODAzOTYzOTUsImlkIjoiMDE5ZTg3ZTEtYzAwMS03MDEyLTkxZWMtMzk2ODJiODNhMDhlIiwicmlkIjoiYjVjYmE2MzktMTIzOS00MmIxLWE5YjQtNzYzZGQxZGIxNjE4In0.W4PwJv_aemDW6PqXxKaUgnIROAiwuzE8ccbK9r6LCsHeZBHAOGRaM-kNMMP-VHGkYIV1qYEIL1K0Sf1hH5xsCQ"
});

async function run() {
  try {
    // Delete all albums and photos to reset remote state
    await client.execute({ sql: "DELETE FROM Photo" });
    console.log("Deleted all photos");
    
    await client.execute({ sql: "DELETE FROM Album" });
    console.log("Deleted all albums");

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
