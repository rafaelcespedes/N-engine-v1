"use client";

/**
 * GA4 — the same property as rafaelcespedes.com (G-X3YN7754BQ).
 *
 * Skipped on /embed: that route is an iframe embedded in the portfolio article, which
 * already loads GA on this same property, so firing here would double-count a pageview
 * on every article view. Everywhere else (the tool itself) is tracked.
 */

import Script from "next/script";
import { usePathname } from "next/navigation";

const GA_ID = "G-X3YN7754BQ";

export function GoogleAnalytics() {
  const pathname = usePathname();
  if (pathname?.startsWith("/embed")) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
