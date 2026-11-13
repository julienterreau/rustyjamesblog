"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function VisitTracker() {
  const pathname = usePathname();
  const query = useSearchParams().toString();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/studio") || pathname.startsWith("/api")) return;
    const started = performance.now();
    const params = new URLSearchParams(query);
    let visitId: string | null = null;
    let sent = false;
    let closed = false;

    const flush = () => {
      if (sent || !visitId) return;
      const seconds = Math.round((performance.now() - started) / 1000);
      if (seconds < 1) return;
      sent = true;
      const body = JSON.stringify({ id: visitId, seconds });
      if (typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon("/api/visites/duree", new Blob([body], { type: "application/json" }));
        return;
      }
      void fetch("/api/visites/duree", {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
        keepalive: true,
      });
    };

    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);

    void fetch("/api/visites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer,
        utm: {
          source: params.get("utm_source") ?? "",
          medium: params.get("utm_medium") ?? "",
          campaign: params.get("utm_campaign") ?? "",
          content: params.get("utm_content") ?? "",
          term: params.get("utm_term") ?? "",
        },
      }),
    })
      .then((response) => (response.status === 201 ? response.json() : null))
      .then((payload: { id?: string } | null) => {
        visitId = payload?.id ?? null;
        if (closed || document.visibilityState === "hidden") flush();
      })
      .catch(() => undefined);

    return () => {
      closed = true;
      flush();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
  }, [pathname, query]);

  return null;
}
