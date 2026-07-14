const Database = require('better-sqlite3');
const db = new Database('./dev.db');


function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

try {
  const parentAlbum = db.prepare('SELECT * FROM Album WHERE name = ?').get('Trung Thu Khu Nhà Trường ');

  if (!parentAlbum) {
    console.error('Parent album not found');
  } else {
    // Check how many photos are currently in the parent
    const photos = db.prepare('SELECT * FROM Photo WHERE albumId = ?').all(parentAlbum.id);
    console.log(`Parent album has ${photos.length} photos.`);
    
    // Create new child album
    const newAlbumId = 'c' + generateId();
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO Album (id, name, description, createdAt, userId, parentId)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(newAlbumId, 'Trung thu 2017', 'Tải lên từ thư mục', now, parentAlbum.userId, parentAlbum.id);
    
    console.log(`Created child album with ID: ${newAlbumId}`);
    
    // Move the photos to the new child album
    const info = db.prepare('UPDATE Photo SET albumId = ? WHERE albumId = ?').run(newAlbumId, parentAlbum.id);
    
    console.log(`Moved ${info.changes} photos back to Trung thu 2017.`);
  }
} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}
