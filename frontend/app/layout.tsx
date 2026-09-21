import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baton — Leads",
  description: "A human takes the first leg. The AI runs the rest. Nobody drops the lead.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">{children}</body>
    </html>
  );
}
