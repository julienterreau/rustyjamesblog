import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-chrome";
import { siteGraph } from "@/lib/seo";
import { getSiteUrl, site } from "@/lib/site";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-montserrat",
  display: "swap",
  adjustFontFallback: true,
  preload: true,
});

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-cormorant",
  display: "swap",
  adjustFontFallback: true,
  preload: true,
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${montserrat.variable} ${display.variable} h-full bg-white`} style={{ colorScheme: "light" }}>
      <head>
        <link rel="preconnect" href="https://framerusercontent.com" />
        <link rel="preconnect" href="https://storage.canalblog.com" />
        <link rel="dns-prefetch" href="https://image.canalblog.com" />
      </head>
      <body className="min-h-full bg-white text-[#161616] antialiased">
        <JsonLd data={siteGraph()} />
        <div className="flex min-h-full flex-col">
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
