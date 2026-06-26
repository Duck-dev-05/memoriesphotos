const Database = require('better-sqlite3');
const db = new Database('dev.db');
const users = db.prepare('SELECT * FROM User').all();
console.log('USERS IN DB:', users);
