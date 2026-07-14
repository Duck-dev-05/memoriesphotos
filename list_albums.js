const Database = require('better-sqlite3');
const db = new Database('./dev.db');

try {
  const albums = db.prepare('SELECT id, name FROM Album').all();
  console.log(albums);
} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}
