import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kỷ Niệm Của Chúng Ta',
    short_name: 'Kỷ Niệm',
    description: 'A beautiful collection of our favorite moments and memories together.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fdfbf7',
    theme_color: '#c97a7e',
    icons: [
      {
        src: '/icon.svg',
        sizes: '192x192 512x512',
        type: 'image/svg+xml',
        purpose: 'maskable'
      }
    ],
  };
}
