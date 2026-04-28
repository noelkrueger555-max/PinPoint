import type { Metadata, Viewport } from "next";
import { Fraunces, Caveat, JetBrains_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

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
  title: "PinPoint — Wo war das nochmal?",
  description:
    "Das persönliche GeoGuessr für Freunde & Familie. Aus deinen Erinnerungen wird ein Spiel.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#f1e7d0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="de"
      className={`${fraunces.variable} ${caveat.variable} ${jetbrains.variable} ${instrument.variable}`}
    >
      <body>
        <div className="app-stack">{children}</div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
