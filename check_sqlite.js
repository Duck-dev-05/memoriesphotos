const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve('d:/Code/Memories Photos/Photomemoriesapplication/Photomemoriesapplication/memories.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.get(`SELECT COUNT(*) as count FROM PhotoMemories`, (err, row) => {
    if (err) {
      console.error(err.message);
    }
    console.log(`Total rows in PhotoMemories: ${row.count}`);
  });

  db.get(`SELECT COUNT(*) as count FROM PhotoMemories WHERE IsDeleted = 1`, (err, row) => {
    if (err) {
      console.error(err.message);
    }
    console.log(`Total IsDeleted=1: ${row.count}`);
  });

  db.get(`SELECT COUNT(*) as count FROM PhotoMemories WHERE IsHidden = 1`, (err, row) => {
    if (err) {
      console.error(err.message);
    }
    console.log(`Total IsHidden=1: ${row.count}`);
  });
  
  db.all(`SELECT OwnerEmail, COUNT(*) as count FROM PhotoMemories GROUP BY OwnerEmail`, (err, rows) => {
      console.log('Group by OwnerEmail:', rows);
  });
});

db.close();
