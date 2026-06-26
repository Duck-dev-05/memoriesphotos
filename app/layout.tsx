import type { Metadata } from "next";
import { Playfair_Display, Lora, Great_Vibes } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Script from "next/script";

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
});

const lora = Lora({
  subsets: ["latin", "vietnamese"],
  variable: "--font-lora",
});

const handwriting = Great_Vibes({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-handwriting",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: "Kỷ Niệm",
    template: "%s | Kỷ Niệm"
  },
  description: "A beautiful collection of our favorite moments and memories together. Lưu giữ những khoảnh khắc đẹp nhất.",
  keywords: ["photos", "memories", "albums", "gallery", "kỷ niệm", "hình ảnh", "album ảnh"],
  authors: [{ name: "Kỷ Niệm" }],
  openGraph: {
    title: "Kỷ Niệm - Bộ Sưu Tập Ký Ức",
    description: "A beautiful collection of our favorite moments and memories together.",
    url: "/",
    siteName: "Kỷ Niệm",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "/images/login_bg.png",
        width: 1200,
        height: 630,
        alt: "Kỷ Niệm - Bộ Sưu Tập Ký Ức",
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Kỷ Niệm - Bộ Sưu Tập Ký Ức",
    description: "A beautiful collection of our favorite moments and memories together.",
    images: ["/images/login_bg.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kỷ Niệm",
  },
  icons: {
    apple: "/icon.svg",
  },
};

export const viewport = {
  themeColor: "#c97a7e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

import { getSession } from "@/lib/auth";
import Footer from "./components/Footer";
import GlobalDropPreventer from "./components/GlobalDropPreventer";
import DragDropUploader from "./components/DragDropUploader";
import { SelectionProvider } from "./contexts/SelectionContext";
import FloatingActionBar from "./components/FloatingActionBar";
import ProgressBar from "./components/ProgressBar";

export default async function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="vi" className={`${playfair.variable} ${lora.variable} ${handwriting.variable}`}>
      <body>
        <Script id="pwa-sw" strategy="afterInteractive" dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful');
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `
        }} />
        <GlobalDropPreventer />
        <div className="paper-texture"></div>
        <Navbar session={session} />
        <DragDropUploader>
          <SelectionProvider>
            <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 80px)" }}>
              {children}
              {modal}
              <Footer />
            </div>
            <FloatingActionBar />
            <ProgressBar />
          </SelectionProvider>
        </DragDropUploader>
      </body>
    </html>
  );
}
