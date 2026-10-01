import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trạm mất tín hiệu · Escape Toán 10",
  description: "Escape game theo nhóm: Toán 10, suy luận logic và gợi ý giàn giáo tự tính phạt.",
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
