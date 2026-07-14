const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "libsql://memories-db-minhd.aws-ap-northeast-1.turso.io?authToken=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODAzOTYzOTUsImlkIjoiMDE5ZTg3ZTEtYzAwMS03MDEyLTkxZWMtMzk2ODJiODNhMDhlIiwicmlkIjoiYjVjYmE2MzktMTIzOS00MmIxLWE5YjQtNzYzZGQxZGIxNjE4In0.W4PwJv_aemDW6PqXxKaUgnIROAiwuzE8ccbK9r6LCsHeZBHAOGRaM-kNMMP-VHGkYIV1qYEIL1K0Sf1hH5xsCQ"
        }
    }
});

async function main() {
  const users = await prisma.user.findMany();
  console.log("Users:", users);

  const albums = await prisma.album.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  console.log("Recent Albums:", albums.map(a => ({ id: a.id, name: a.name, userId: a.userId })));

  const photos = await prisma.photo.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  console.log("Recent Photos:", photos.map(p => ({ id: p.id, url: p.url.substring(0, 50), albumId: p.albumId, userId: p.userId })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
