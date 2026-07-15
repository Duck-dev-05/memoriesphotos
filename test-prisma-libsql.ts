import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

try {
  const adapter = new PrismaLibSql({
    url: 'file:./dev.db',
  } as any);
  console.log("Success with object:", adapter);
} catch (e: any) {
  console.log("Error with object:", e.message);
}

try {
  const client = createClient({ url: 'file:./dev.db' });
  const adapter2 = new PrismaLibSql(client);
  console.log("Success with client:", adapter2);
} catch (e: any) {
  console.log("Error with client:", e.message);
}
