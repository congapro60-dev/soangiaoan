import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cuộc đua cứu hộ Trạm 07 · Toán 10",
  description: "Cuộc đua theo nhóm với linh vật, xúc xắc cân bằng, thử thách Toán 10 và logic, sự kiện và kỹ năng tự tính điểm.",
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
