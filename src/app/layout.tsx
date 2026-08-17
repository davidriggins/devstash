import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevStash",
  description: "Stash and organize your developer resources",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      {/* Toaster is a provider, so it wraps the tree rather than sitting beside
          it. At the root, a toast raised just before a navigation survives it. */}
      <body>
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}
