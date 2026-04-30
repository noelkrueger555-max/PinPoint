import type { Metadata, Viewport } from "next";
import { Fraunces, Caveat, JetBrains_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallPrompt from "@/components/InstallPrompt";
import CloudRestore from "@/components/CloudRestore";
import MobileTabbar from "@/components/MobileTabbar";
import { Toaster } from "@/lib/toast";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://pinpoint.local"
  ),
  title: {
    default: "PinPoint — Wo war das nochmal?",
    template: "%s · PinPoint",
  },
  description:
    "Das persönliche GeoGuessr für Freunde & Familie. Aus deinen Erinnerungen wird ein Spiel.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  applicationName: "PinPoint",
  keywords: [
    "GeoGuessr",
    "Foto-Spiel",
    "Erinnerungen",
    "Map-Game",
    "PWA",
  ],
  authors: [{ name: "PinPoint" }],
  openGraph: {
    type: "website",
    locale: "de_DE",
    title: "PinPoint — Wo war das nochmal?",
    description:
      "Aus deinen Foto-Erinnerungen wird ein GeoGuessr-Spiel für Freunde & Familie.",
    siteName: "PinPoint",
  },
  twitter: {
    card: "summary_large_image",
    title: "PinPoint — Wo war das nochmal?",
    description:
      "Aus deinen Foto-Erinnerungen wird ein GeoGuessr-Spiel für Freunde & Familie.",
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#f1e7d0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="de"
      className={`${fraunces.variable} ${caveat.variable} ${jetbrains.variable} ${instrument.variable}`}
    >
      <body>
        <a href="#main-content" className="skip-to-content">
          Zum Inhalt springen
        </a>
        <div className="app-stack">{children}</div>
        <ServiceWorkerRegister />
        <InstallPrompt />
        <CloudRestore />
        <MobileTabbar />
        <Toaster />
      </body>
    </html>
  );
}
