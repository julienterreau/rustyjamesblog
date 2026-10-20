import type { Metadata } from "next";
import { EB_Garamond, Montserrat } from "next/font/google";
import { Suspense } from "react";
import { GazetteFooter } from "@/components/gazette-footer";
import { GazetteHeader } from "@/components/gazette-header";
import { JsonLd } from "@/components/json-ld";
import { siteGraph } from "@/lib/seo";
import { getSiteUrl, site } from "@/lib/site";
import "../globals.css";
import "../gazette.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

const display = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: site.title,
    template: "%s · Rusty James News",
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: "Rusty James News" }],
  creator: site.name,
  publisher: site.name,
  category: "news",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
    title: site.title,
    description: site.description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${montserrat.variable} ${display.variable}`}>
      <body id="top">
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
        <JsonLd data={siteGraph()} />
        <a className="skip" href="#une">
          Aller au contenu
        </a>
        <Suspense fallback={null}>
          <GazetteHeader />
        </Suspense>
        {children}
        <GazetteFooter />
      </body>
    </html>
  );
}
