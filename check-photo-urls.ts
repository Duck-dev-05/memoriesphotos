const { PrismaClient } = require('../app/generated/db/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { createClient } = require('@libsql/client');

const connectionString = process.env.DATABASE_URL || 'file:./dev.db';
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const adapter = new PrismaLibSql({
  url: connectionString,
  authToken,
});

const prisma = new PrismaClient({ adapter });

async function checkPhotoUrls() {
  const photos = await prisma.photo.findMany({
    select: {
      id: true,
      url: true,
      altText: true,
      fileSize: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  console.log("Recent photo URLs:");
  console.log("==================");
  
  photos.forEach((photo) => {
    const storageType = photo.url?.includes("cloudinary") 
      ? "Cloudinary" 
      : photo.url?.includes("ibb.co") 
      ? "ImgBB" 
      : photo.url?.startsWith("/uploads/") 
      ? "Local" 
      : "Unknown";
    
    console.log(`ID: ${photo.id}`);
    console.log(`Title: ${photo.altText}`);
    console.log(`URL: ${photo.url}`);
    console.log(`Storage: ${storageType}`);
    console.log(`Size: ${photo.fileSize ? (photo.fileSize / 1024 / 1024).toFixed(2) + " MB" : "Unknown"}`);
    console.log(`Created: ${photo.createdAt}`);
    console.log("---");
  });
}

checkPhotoUrls()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
