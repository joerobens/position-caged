import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Position - CAGED practice",
  description:
    "The five CAGED shapes in any key, major or minor, with the scale built around each one, a drone, and a metronome that moves you between positions.",
  appleWebApp: { capable: true, title: "Position", statusBarStyle: "black-translucent" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#12100E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
};

/**
 * Runs before first paint so the page never flashes the wrong theme. It reads the
 * same stored settings the app uses and falls back to the system setting.
 */
const THEME_SCRIPT = `(function(){try{
var p=(JSON.parse(localStorage.getItem("fretwork:v1")||"{}")||{}).theme||"system";
var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.dataset.theme=d?"dark":"light";
}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${bricolage.variable} ${plexMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
