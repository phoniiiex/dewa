import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "دەوا | سیستەمی بەڕێوەبردنی دەرمانسازی",
  description: "سیستەمی بەڕێوەبردنی دەرمانسازی B2B — دەوا",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ckb" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
