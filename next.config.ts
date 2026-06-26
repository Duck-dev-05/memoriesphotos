import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['exifr'],
  experimental: {
    serverActions: {
      bodySizeLimit: '1000mb',
    },
  },
  images: {
    loader: 'custom',
    loaderFile: './lib/cloudinaryLoader.ts',
    qualities: [1, 75],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
