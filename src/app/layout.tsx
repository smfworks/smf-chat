import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "smf-chat — Secure Multi-Agent Chat",
  description: "Private chat for Michael's agent network",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
