import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenUni Prototype",
  description: "OpenUni key-signal assistant prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
