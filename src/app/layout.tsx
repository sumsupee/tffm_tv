import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tasveer Film Center — Signage",
  description: "Digital signage display for Tasveer Film Center",
};

// Ensures Chromium on Raspberry Pi renders at device resolution (1:1 scale)
// without this, older Chromium uses a virtual 980px viewport and scales down,
// showing only part of the screen.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className={inter.variable + " " + jetbrainsMono.variable + " h-full antialiased"}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;900&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          body { font-family: 'Outfit', sans-serif !important; }
          .circle-theater { border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; }
        ` }} />
        <script dangerouslySetInnerHTML={{ __html: `
          window.onerror = function(msg, url, line, col, error) {
            var div = document.createElement('div');
            div.style.position = 'fixed';
            div.style.top = '0';
            div.style.left = '0';
            div.style.right = '0';
            div.style.backgroundColor = 'red';
            div.style.color = 'white';
            div.style.padding = '10px';
            div.style.zIndex = '10000';
            div.style.fontSize = '12px';
            div.innerHTML = 'JS ERR: ' + msg + ' (line ' + line + ')<br>UA: ' + navigator.userAgent;
            document.body.appendChild(div);
          };
        ` }} />
      </head>
      <body className="min-h-full flex flex-col font-sans" style={{ fontFamily: "'Outfit', sans-serif" }}>{children}</body>
    </html>
  );
}
