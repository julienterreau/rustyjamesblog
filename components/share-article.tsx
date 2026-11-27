"use client";

import { getSiteUrl } from "@/lib/site";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type ShareArticleProps = {
  path: string;
  title: string;
};

type Destination = {
  label: string;
  icon: ReactNode;
  href: (url: string, title: string) => string;
  external?: boolean;
};

function pageUrl(path: string) {
  return new URL(path, getSiteUrl()).href;
}

function Mark({ path }: { path: string }) {
  return (
    <svg className="share-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d={path} />
    </svg>
  );
}

function Glyph({ name }: { name: string }) {
  return (
    <span className="ms notranslate" translate="no" aria-hidden="true">
      {name}
    </span>
  );
}

function ShareArrow() {
  return <span className="share-mark" aria-hidden="true" />;
}

const DESTINATIONS: Destination[] = [
  {
    label: "Partager sur Facebook",
    icon: <Mark path="M14.5 8.5V6.8c0-.7.5-1 1.2-1H17V3h-2.2C12.2 3 11 4.3 11 6.6v1.9H9v2.7h2V21h3.5v-9.8h2.3l.4-2.7h-2.7Z" />,
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    external: true,
  },
  {
    label: "Partager sur X",
    icon: <Mark path="M14.7 10.4 21.4 3h-1.6l-5.8 6.4L9.2 3H3.4l7 9.8L3.4 21h1.6l6.2-6.9L15.2 21h5.8l-7.3-10.6Zm-2.2 2.4-.7-1L5.6 4.2h2.4l4.6 6.3.7 1 6 8.2h-2.4l-4.4-6.9Z" />,
    href: (url, title) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    external: true,
  },
  {
    label: "Partager sur LinkedIn",
    icon: <Mark path="M6.5 9H3.7v11.2h2.8V9ZM5.1 3.2A1.7 1.7 0 1 0 5.1 6.6 1.7 1.7 0 0 0 5.1 3.2ZM20.3 13.4c0-3-1.6-4.4-3.7-4.4-1.7 0-2.5.9-2.9 1.6V9H11v11.2h2.8v-6.2c0-1.6.3-3.2 2.3-3.2s2 1.8 2 3.3v6.1h2.8v-6.8Z" />,
    href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    external: true,
  },
  {
    label: "Partager sur Telegram",
    icon: <Mark path="M21.2 4.4 2.9 11.5c-1.2.5-1.2 1.2-.2 1.5l4.7 1.5 10.8-6.8c.5-.3 1-.1.6.2l-8.8 7.9-.3 4.6c.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.4-1.4Z" />,
    href: (url, title) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    external: true,
  },
  {
    label: "Partager sur WhatsApp",
    icon: (
      <Mark path="M12 3.2A8.7 8.7 0 0 0 4.6 16.3L3.4 20.6l4.4-1.2A8.8 8.8 0 1 0 12 3.2Zm0 1.6a7.1 7.1 0 0 1 6.1 10.6l-.2.4.5 2.1-2.2-.6-.4.2A7.1 7.1 0 1 1 12 4.8Zm3.8 9.1c-.2-.1-1.2-.6-1.4-.6-.2-.1-.3-.1-.5.1l-.5.7c-.1.2-.3.2-.5.1a5.8 5.8 0 0 1-2.9-2.6c-.1-.2 0-.4.1-.5l.4-.4c.1-.2.1-.3 0-.4l-.6-1.5c-.2-.4-.3-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.3-.8.8-.8 1.9s.8 2.2.9 2.4c.1.1 1.6 2.4 3.9 3.3 1.5.6 1.8.5 2.4.4.4-.1 1.2-.5 1.4-1 .1-.5.1-.9.1-1-.1-.1-.2-.2-.4-.3Z" />
    ),
    href: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    external: true,
  },
  {
    label: "Partager sur Messenger",
    icon: <Mark path="M12 3C6.8 3 2.8 6.6 2.8 11.1c0 2.5 1.2 4.7 3.2 6.2V21l2.9-1.6c.9.3 1.9.4 3 .4 5.2 0 9.2-3.6 9.2-8.1S17.2 3 12 3Zm.9 10.8-2.4-2.5-4.6 2.5 5.1-5.4 2.4 2.5 4.6-2.5-5.1 5.4Z" />,
    href: (url) =>
      `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(url)}`,
    external: true,
  },
  {
    label: "Partager sur Reddit",
    icon: <Mark path="M14.8 4.2 16 7.3a6.4 6.4 0 0 1 3.2.9l1.6-1.1a1.2 1.2 0 1 1 .5 1.9l-1.3.9a6.5 6.5 0 0 1 .1 1.2c0 3.6-3.2 6.5-7.1 6.5S5.9 14.7 5.9 11.1c0-.4 0-.8.1-1.2l-1.3-.9a1.2 1.2 0 1 1 .5-1.9l1.6 1.1a6.4 6.4 0 0 1 3.2-.9l1.2-3.1a1.3 1.3 0 1 1 1.2.4l-.6 1.6ZM9.2 11.6a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm5.6 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4ZM12 15.4c1.3 0 2.4-.5 3-.9.2-.2.2-.4 0-.6-.2-.2-.5-.1-.7.1-.4.3-1.2.7-2.3.7s-1.9-.4-2.3-.7c-.2-.2-.5-.3-.7-.1-.2.2-.2.4 0 .6.6.4 1.7.9 3 .9Z" />,
    href: (url, title) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    external: true,
  },
  {
    label: "Partager sur Bluesky",
    icon: (
      <Mark path="M12 10.8c-1.1-2.1-4-6-6.8-8C2.6.9 1.6 1.3.9 1.6.1 1.9 0 3.1 0 3.8c0 .7.4 5.6.6 6.5.8 2.6 3.6 3.5 6.2 3.2-4.2.6-7.9 2.1-3 7.5 4.6 5.1 6.7-1.3 8.2-4.8 1.5 3.5 3.2 10 8.2 4.8 4.9-5.4 1.2-6.9-3-7.5 2.6.3 5.4-.6 6.2-3.2.2-.9.6-5.8.6-6.5 0-.7-.1-1.9-.9-2.2-.7-.3-1.7-.7-4.3 1.2-2.7 2-5.7 6-6.8 8Z" />
    ),
    href: (url, title) =>
      `https://bsky.app/intent/compose?text=${encodeURIComponent(`${title} ${url}`)}`,
    external: true,
  },
  {
    label: "Partager par e-mail",
    icon: <Glyph name="mail" />,
    href: (url, title) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  },
];

export function ShareArticle({ path, title }: ShareArticleProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [up, setUp] = useState(false);
  const [end, setEnd] = useState(false);
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

  function onShare() {
    if (open) {
      setOpen(false);
      return;
    }
    const box = buttonRef.current?.getBoundingClientRect();
    setUp(Boolean(box && box.bottom + 500 > window.innerHeight && box.top > 500));
    setEnd(Boolean(box && box.left + 300 > window.innerWidth));
    setOpen(true);
  }

  const place = `${up ? " is-up" : ""}${end ? " is-end" : ""}`;

  return (
    <div className={open ? "share is-open" : "share"} ref={rootRef}>
      <button
        ref={buttonRef}
        className="share-btn"
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Partager"
        onClick={onShare}
      >
        <ShareArrow />
        share
      </button>
      {open ? (
        <div className={`share-menu${place}`} id={menuId} role="menu">
          <button className="share-copy notranslate" type="button" role="menuitem" translate="no" onClick={() => void onCopy()}>
            <Glyph name={copied ? "check" : "link"} />
            <span>{copied ? "Lien copié" : "Copier le lien"}</span>
          </button>
          {DESTINATIONS.map((item) => (
            <a
              key={item.label}
              role="menuitem"
              href={item.href(pageUrl(path), title)}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.icon}
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
