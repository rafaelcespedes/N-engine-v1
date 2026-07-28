import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

// Headlines: Bricolage Grotesque (variable). Body: IBM Plex Sans.
const headline = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
});
const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});
// Mobile gate only. ABC Monument Grotesk (Regular only — the licensed weight we have).
const monument = localFont({
  src: "./fonts/ABCMonumentGrotesk-Regular.woff2",
  variable: "--font-monument",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nengine.rafaelcespedes.com"),
  title: "Generative Tool for Nucleus",
  description:
    "Nengine is a tool created for Nucleus by Rafael Cespedes to facilitate and partly automate the creation of social media assets. The tool takes the look and feel of Nucleus and presents controls that allow guardrailed customization — background image, color, text, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${headline.variable} ${body.variable} ${monument.variable}`}>
      <body className="font-sans">{children}</body>
      <GoogleAnalytics />
    </html>
  );
}
