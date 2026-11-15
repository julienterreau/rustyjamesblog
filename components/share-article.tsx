"use client";

import { useEffect, useId, useRef, useState } from "react";

type ShareArticleProps = {
  path: string;
  title: string;
};

type Network = {
  label: string;
  href: (url: string, title: string) => string;
  external?: boolean;
};

const NETWORKS: Network[] = [
  {
    label: "WhatsApp",
    href: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    external: true,
  },
  {
    label: "Facebook",
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    external: true,
  },
  {
    label: "X",
    href: (url, title) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    external: true,
  },
  {
    label: "Telegram",
    href: (url, title) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    external: true,
  },
  {
    label: "LinkedIn",
    href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    external: true,
  },
  {
    label: "E-mail",
    href: (url, title) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  },
];

function pageUrl(path: string) {
  return new URL(path, window.location.origin).href;
}

export function ShareArticle({ path, title }: ShareArticleProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [up, setUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  function revealMenu() {
    const box = buttonRef.current?.getBoundingClientRect();
    setUp(Boolean(box && box.bottom + 280 > window.innerHeight && box.top > 280));
    setOpen(true);
  }

  async function nativeShare() {
    const url = pageUrl(path);
    const payload = { title, url };
    if (typeof navigator.share !== "function") return false;
    if (navigator.canShare && !navigator.canShare(payload)) return false;
    try {
      await navigator.share(payload);
      setOpen(false);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return true;
      return false;
    }
  }

  async function onShare() {
    const phone = window.matchMedia("(pointer: coarse)").matches;
    if (phone && (await nativeShare())) return;
    if (open) setOpen(false);
    else revealMenu();
  }

  async function onCopy() {
    const url = pageUrl(path);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("textarea");
      input.value = url;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.left = "-999px";
      document.body.append(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
  }

  return (
    <div className={open ? "share is-open" : "share"} ref={rootRef}>
      <button
        ref={buttonRef}
        className="share-btn"
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Partager"
        onClick={() => void onShare()}
      >
        <span className="ms" aria-hidden="true">
          share
        </span>
      </button>
      {open ? (
        <div className={up ? "share-menu is-up" : "share-menu"} id={menuId} role="menu">
          <button className="share-copy" type="button" role="menuitem" onClick={() => void onCopy()}>
            {copied ? "Lien copié" : "Copier le lien"}
          </button>
          {NETWORKS.map((network) => (
            <a
              key={network.label}
              role="menuitem"
              href={network.href(pageUrl(path), title)}
              target={network.external ? "_blank" : undefined}
              rel={network.external ? "noopener noreferrer" : undefined}
              onClick={() => setOpen(false)}
            >
              {network.label}
            </a>
          ))}
          {typeof navigator.share === "function" ? (
            <button type="button" role="menuitem" onClick={() => void nativeShare()}>
              Autres applications
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
