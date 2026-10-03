import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mật Mã Đa Giới · Toán 10–12",
  description: "Hành trình Toán học qua mười hai thế giới, với cốt truyện, bản đồ và phản hồi tương tác.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
