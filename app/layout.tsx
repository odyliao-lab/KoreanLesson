import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://korean.odyliao.cc"),
  title: "별빛韓語研究所｜Starlight Korean Lab",
  description:
    "為零基礎國中生打造的 20 天互動韓語學習星圖，每天 45–60 分鐘，支援韓語語音與 iPad 觸控操作。",
  openGraph: {
    title: "별빛韓語研究所",
    description: "每天點亮一顆星，從零開始學韓語。",
    type: "website",
    locale: "zh_TW",
    images: [{ url: "/og.png", width: 1536, height: 1024 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "별빛韓語研究所",
    description: "每天點亮一顆星，從零開始學韓語。",
    images: ["/og.png"],
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
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
