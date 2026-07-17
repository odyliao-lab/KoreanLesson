import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://korean.odyliao.cc"),
  manifest: "/manifest.webmanifest",
  title: "별빛韓語研究所｜Starlight Korean Lab",
  description:
    "為國中生打造的 50 天互動韓語學習星圖，涵蓋初級、中級與高級三階段，每天 45–60 分鐘，支援韓語語音與 iPad 觸控操作。",
  openGraph: {
    title: "별빛韓語研究所",
    description: "從零基礎到正式發表，完成 50 天三階段韓語星光航線。",
    type: "website",
    locale: "zh_TW",
    images: [{ url: "/og.png", width: 1536, height: 1024 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "별빛韓語研究所",
    description: "從零基礎到正式發表，完成 50 天三階段韓語星光航線。",
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
