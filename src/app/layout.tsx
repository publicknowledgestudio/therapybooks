import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "therapybook",
  description: "Simple bookkeeping for Indian therapists",
  metadataBase: new URL("https://therapybook.in"),
  openGraph: {
    title: "therapybook",
    description: "Simple bookkeeping for Indian therapists",
    url: "https://therapybook.in",
    siteName: "therapybook",
    images: [
      {
        url: "/therapybook-og.jpg",
        width: 1200,
        height: 630,
        alt: "therapybook — Simple bookkeeping for Indian therapists",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "therapybook",
    description: "Simple bookkeeping for Indian therapists",
    images: ["/therapybook-og.jpg"],
  },
  icons: {
    icon: [
      { url: "/therapybook-icon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Analytics />
        <Toaster />
      </body>
    </html>
  );
}
