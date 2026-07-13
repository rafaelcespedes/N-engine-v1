import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Nengine",
  description: "Image → grid system.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${headline.variable} ${body.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
