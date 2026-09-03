import type { Metadata } from "next";
import "./globals.css";
import { Disclaimer } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Stencil — diary entries into evidence-based templates",
  description:
    "Paste journal entries. Stencil maps them onto evolving, editable frameworks annotated with your own words.",
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
