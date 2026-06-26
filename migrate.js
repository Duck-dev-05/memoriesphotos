const Database = require('better-sqlite3');
const db = new Database('./dev.db');

try {
  const fromAlbum = db.prepare('SELECT * FROM Album WHERE name = ?').get('Trung thu 2017');
  const toAlbum = db.prepare('SELECT * FROM Album WHERE name = ?').get('Trung Thu Khu Nhà Trường ');

  if (!fromAlbum || !toAlbum) {
    console.error('Albums not found:', { fromAlbum, toAlbum });
  } else {
    console.log(`Found albums: From ${fromAlbum.id} to ${toAlbum.id}`);
    
    const info = db.prepare('UPDATE Photo SET albumId = ? WHERE albumId = ?').run(toAlbum.id, fromAlbum.id);
    console.log(`Updated ${info.changes} photos.`);
    
    db.prepare('DELETE FROM Album WHERE id = ?').run(fromAlbum.id);
    console.log('Deleted album Trung thu 2017.');
  }
} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}
