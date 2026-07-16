import { createClient } from '@libsql/client';

async function test() {
  const client = createClient({ url: 'file:./dev.db' });
  try {
    const res = await client.execute("SELECT 1;");
    console.log("Success libsql:", res);
  } catch (e) {
    console.error("libsql error:", e);
  }
}
test();
