import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["200", "300", "400", "500"], variable: "--font-inter" });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["300", "400"], variable: "--font-deva" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "VOIZ — Hindi voice agents for lending & collections",
  description: "Type a goal, deploy a compliant Hindi voice agent in 60 seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${deva.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
