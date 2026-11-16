"use client";

import Script from "next/script";

const SETTINGS = {
  default_language: "fr",
  languages: ["fr", "en", "es", "de", "it", "pt", "ar"],
  wrapper_selector: "#gtranslate",
  detect_browser_language: true,
  url_structure: "none",
  horizontal_position: "inline",
};

export function GTranslate() {
  return (
    <>
      <div className="gtranslate_wrapper notranslate" id="gtranslate" translate="no" aria-hidden="true" inert />
      <Script id="gtranslate-settings" strategy="afterInteractive">
        {`window.gtranslateSettings=${JSON.stringify(SETTINGS)};`}
      </Script>
      <Script src="https://cdn.gtranslate.net/widgets/latest/dropdown.js" strategy="afterInteractive" />
    </>
  );
}
