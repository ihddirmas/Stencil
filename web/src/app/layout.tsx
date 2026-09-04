import type { Metadata } from "next";
import "./globals.css";
import { Disclaimer } from "@/components/SiteChrome";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Stencil — evidence-based journaling agent for mental health",
  description:
    "Crisis-gated agent that turns diary entries into cited visual worksheets (CBT, identity, forgiveness) with memory, PII minimization, and output verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Disclaimer />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
