# Production Deployment Guide

This guide outlines the steps required to deploy the Memories Photos application in a production environment.

## 1. Prerequisites

Before deploying to production, ensure you have the following:

- **Node.js** (v18.x or later recommended)
- **Redis Server**: A running Redis instance for caching and background jobs.
- **Cloudinary Account**: API keys for image and video hosting.
- **Database**: A persistent storage location for your SQLite database, or migrate to PostgreSQL/MySQL if preferred.

## 2. Environment Variables

Create a `.env` file (or set environment variables in your deployment platform) based on `.env.example` (or your existing `.env`):

```env
# Database
DATABASE_URL="file:./prod.db" # Make sure this points to a persistent volume

# Cloudinary
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your_cloud_name"

# Redis
REDIS_URL="redis://localhost:6379" # Update with your production Redis URL

# Authentication (If applicable)
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your_random_secure_string"
```

> [!WARNING]
> Never commit your production `.env` file to version control.

## 3. Database Migration

Before starting the app, you need to apply the database schema. Run the following command:

```bash
npx prisma db push
# OR if using migrations:
# npx prisma migrate deploy
```

## 4. Building the Application

Next.js requires you to build the application for production to optimize assets and create static pages.

```bash
# Install dependencies
npm ci # or npm install

# Build the app
npm run build
```

## 5. Starting the Server

Once the build is complete, you can start the production server:

```bash
npm run start
```

By default, the server will run on `http://localhost:3003` (as defined in `package.json`). We recommend using a process manager like **PM2** to keep the app running continuously.

### Using PM2

```bash
npm install -g pm2
pm2 start npm --name "memoriesphotos" -- run start
```

## 6. Using Docker (Optional but Recommended)

You can use Docker to easily manage your Redis instance and Node.js app.

1. Ensure Redis is running via Docker Compose (the existing `docker-compose.yml` provides a Redis service):
   ```bash
   docker-compose up -d redis
   ```
2. You can create a `Dockerfile` for the Next.js app to containerize the entire application, ensuring persistent volumes for the SQLite database.

## 7. Reverse Proxy (Nginx/Caddy)

For a real-world production setup, it is highly recommended to place your Node.js application behind a reverse proxy like **Nginx** or **Caddy** to handle SSL (HTTPS), caching, and domain routing.

- Ensure you proxy requests to port `3003`.
- Set up SSL certificates using Let's Encrypt.

## 8. Free Hosting Recommendations

If you want to deploy this project for free, here are the best platforms depending on how you configure your database.

### Option 1: Vercel (Best for Next.js, but requires a Cloud Database)
Since Vercel uses Serverless functions, any local SQLite file (`dev.db` or `prod.db`) will be **erased** every time the server restarts. To use Vercel for free:
- **Hosting**: [Vercel](https://vercel.com/) (Excellent Free Tier for Next.js).
- **Database**: You must switch from local SQLite to a free cloud database like [Turso](https://turso.tech/) (SQLite for the edge), [Neon](https://neon.tech/) (PostgreSQL), or [Supabase](https://supabase.com/) (PostgreSQL).
- **Redis**: Use [Upstash](https://upstash.com/) for a free Serverless Redis.

### Option 2: Oracle Cloud "Always Free" VPS (Best for keeping local SQLite)
If you want to keep using the local SQLite database and deploy via Docker without rewriting configurations, a VPS (Virtual Private Server) is the best choice.
- **Hosting**: [Oracle Cloud Always Free](https://www.oracle.com/cloud/free/) provides up to 4 ARM Ampere A1 Compute instances with 24GB RAM and 200GB block storage. This is an incredibly generous free tier.
- You can install Docker, Next.js, Redis, and keep your SQLite database running 24/7 exactly like you do on your local machine.

### Option 3: Render or Railway (PaaS)
- **[Render](https://render.com/)**: Has a free tier for Web Services, but it spins down after 15 minutes of inactivity (cold starts take time). It also does not support persistent disks on the free tier, meaning you still need a cloud database (like Turso or Neon).
- **[Railway](https://railway.app/)**: Very easy to deploy Docker containers and Next.js, but they removed their permanent free tier (they only offer a one-time trial credit).

**Our Recommendation:**
1. If you want the **easiest deployment without changing code**: Try to get an **Oracle Cloud Always Free VPS**, run Docker, and host everything yourself.
2. If you want **serverless scaling and fast deployments**: Deploy the Next.js app to **Vercel**, change the database in Prisma to use **Turso (Free SQLite Cloud)**, and use **Upstash (Free Redis)**.
