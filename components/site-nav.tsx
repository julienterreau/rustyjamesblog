"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/#une", label: "À la une" },
  { href: "/#dossiers", label: "Dossiers" },
  { href: "/#categories", label: "Catégories" },
  { href: "/archives", label: "Archives" },
];

export function SiteNavFallback() {
  return <Nav pathname="" />;
}

export function SiteNav() {
  return <Nav pathname={usePathname()} />;
}

function Nav({ pathname }: { pathname: string }) {
  return (
    <nav className="overflow-x-auto border-y border-[#e7e7e7] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex w-max flex-nowrap items-center gap-x-4 lg:gap-x-8 py-3.5">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : link.href === "/archives"
                ? pathname === "/archives" || pathname.startsWith("/archives?")
                : false;
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={link.href === "/archives" ? false : undefined}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 text-[13px] font-bold tracking-[-0.02em] whitespace-nowrap underline-offset-4 transition-colors hover:text-[#161616] hover:underline ${
                active ? "text-[#161616] underline" : "text-[#737373] no-underline"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
