import type { Metadata, Viewport } from "next";
import { Oswald, Share_Tech_Mono } from "next/font/google";
import { EvmProvider } from "@/components/providers/EvmProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { app } from "@/lib/app-config";
import "./globals.css";

/** Condensed plate lettering, and a stamped mono for dates and amounts. */
const plate = Oswald({ variable: "--font-plate", subsets: ["latin"], display: "swap" });
const stamp = Share_Tech_Mono({ variable: "--font-stamp", subsets: ["latin"], weight: "400", display: "swap" });

export const metadata: Metadata = {
  title: `${app.name} — ${app.tagline}`,
  description: app.tagline,
  openGraph: { title: app.name, description: app.tagline, type: "website", url: app.url },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#101418" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plate.variable} ${stamp.variable} h-full`}>
      <body className="min-h-full antialiased">
        <EvmProvider>
          <ToastProvider>{children}</ToastProvider>
        </EvmProvider>
      </body>
    </html>
  );
}
