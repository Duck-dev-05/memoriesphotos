import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, datasourceUrl: 'postgresql://postgres:postgres@localhost:5432/postgres' });
