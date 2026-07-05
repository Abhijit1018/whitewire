import type { Metadata } from "next";
import { Geist, Geist_Mono, Caveat, Fraunces } from "next/font/google";
import "./globals.css";
import "@xyflow/react/dist/style.css";
import { RouteProgress } from "@/components/app-shell/route-progress";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

// Editorial display serif for headlines — soft, high-character, optical sizing.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: "WhiteWire",
  description: "AI-native canvas workspace. Bring your own LLM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RouteProgress />
        {children}
      </body>
    </html>
  );
}
