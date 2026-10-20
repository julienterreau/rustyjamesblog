"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/#une", label: "À la une" },
  { href: "/archives", label: "Archives" },
  { href: "/#categories", label: "Catégories" },
];

export function GazetteHeader() {
  const pathname = usePathname();
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const home = pathname === "/";

  return (
    <header className="site-head">
      <div className="head-in">
        <div className="head-brand">
          <Link className="brand" href="/">
            <span className="brand-name">Rusty James</span>
            <span className="brand-sub">News</span>
          </Link>
          <span className="head-sep" aria-hidden="true" />
          <span className="head-tagline">Explorer. Questionner. Comprendre.</span>
        </div>
        <div className="head-end">
        <nav className="main-nav" aria-label="Navigation principale">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              aria-current={
                link.href === "/archives"
                  ? pathname === "/archives"
                    ? "page"
                    : undefined
                  : link.label === "Accueil" && home
                    ? "page"
                    : undefined
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="head-actions">
          <button
            className="icon-btn"
            type="button"
            aria-expanded={search}
            aria-controls="search-panel"
            aria-label="Rechercher dans les archives"
            onClick={() => setSearch((value) => !value)}
          >
            <span className="ms" aria-hidden="true">
              search
            </span>
          </button>
          <button
            className="icon-btn menu-btn"
            type="button"
            aria-expanded={menu}
            aria-controls="mobile-menu"
            aria-label={menu ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setMenu((value) => !value)}
          >
            <span className="ms" aria-hidden="true">
              {menu ? "close" : "menu"}
            </span>
          </button>
        </div>
        </div>
      </div>
      <div className="search-panel" id="search-panel" hidden={!search}>
        <form className="search-in" action="/" method="get">
          <span className="ms search-ico" aria-hidden="true">
            search
          </span>
          <input
            id="q"
            type="search"
            name="q"
            placeholder="Rechercher dans les archives — mots-clés, dates, thèmes…"
            aria-label="Rechercher dans les archives"
            autoComplete="off"
          />
        </form>
      </div>
      <nav className="mobile-menu" id="mobile-menu" hidden={!menu} aria-label="Navigation mobile">
        {LINKS.map((link) => (
          <Link key={link.label} href={link.href} onClick={() => setMenu(false)}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
