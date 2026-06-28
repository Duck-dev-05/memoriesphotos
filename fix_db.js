const { createClient } = require('@libsql/client');

const client = createClient({
  url: "libsql://memories-db-minhd.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODAzOTYzOTUsImlkIjoiMDE5ZTg3ZTEtYzAwMS03MDEyLTkxZWMtMzk2ODJiODNhMDhlIiwicmlkIjoiYjVjYmE2MzktMTIzOS00MmIxLWE5YjQtNzYzZGQxZGIxNjE4In0.W4PwJv_aemDW6PqXxKaUgnIROAiwuzE8ccbK9r6LCsHeZBHAOGRaM-kNMMP-VHGkYIV1qYEIL1K0Sf1hH5xsCQ"
});

async function run() {
  try {
    const userId = 'cmqxp0une000004ife90ju6yw';

    // Delete the duplicates and the test album
    const toDelete = ['cmqxuwfkw000004i5vn0ju5za', 'cmqxuwfrk000004l8psc3dbym', 'cmqxv5ye5000004l7zaww7xn4'];
    for (const id of toDelete) {
      await client.execute({
        sql: "DELETE FROM Album WHERE id = ?",
        args: [id]
      });
      console.log("Deleted", id);
    }

    // Assign the remaining album to the user
    await client.execute({
      sql: "UPDATE Album SET userId = ? WHERE id = ?",
      args: [userId, 'cmqxokz26000204l7oi8fp801']
    });
    console.log("Updated original album userId");

    // Also fix photos if any
    await client.execute({
      sql: "UPDATE Photo SET userId = ? WHERE userId IS NULL",
      args: [userId]
    });
    console.log("Updated photos userId");

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
