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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
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
          console.log('Legacy log: ' + navigator.userAgent);
        ` }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
