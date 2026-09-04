import type { Metadata } from "next";
import "./globals.css";
import { Disclaimer } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Stencil — evidence-based journaling agent for mental health",
  description:
    "Braindump once — crisis-gated agent fills cited visual therapy worksheets (CBT, identity, forgiveness) and updates structured memory. Not a chat wall.",
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
      </body>
    </html>
  );
}
