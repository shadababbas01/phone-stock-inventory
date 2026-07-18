import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mangla Communication",
  description: "Live mobile phone prices, exact variants and stock availability at Mangla Communication.",
  manifest: "/manifest.webmanifest",
  other: { "codex-preview": "development" },
  icons: { icon: "/mangla-logo.svg", shortcut: "/mangla-logo.svg", apple: "/mangla-logo.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Mangla Communication" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07090b",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('mangla-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}` }} />
        {children}
      </body>
    </html>
  );
}
