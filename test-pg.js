const { Pool } = require('pg');
async function test() {
try {
  const pool = new Pool({ connectionString: 'undefined' });
  await pool.connect();
  console.log('success');
} catch (e) {
  console.error('ERROR:', e.message);
}
}
test();
