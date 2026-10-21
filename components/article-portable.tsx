import { articlePath, resolveArchiveSlugs } from "@/lib/articles";
import { articleHrefPath, internalLinkPaths, sameTitle } from "@/lib/seo";
import { SanityImage } from "@/components/sanity-image";
import { sanityImageSource } from "@/sanity/lib/image";
import { PortableText, toPlainText, type PortableTextBlock, type PortableTextComponents } from "@portabletext/react";

function linkProbe(blocks: PortableTextBlock[]) {
  const hrefs: string[] = [];
  for (const block of blocks) {
    if (block._type !== "block" || !Array.isArray(block.markDefs)) continue;
    for (const mark of block.markDefs) {
      if (mark._type === "link" && "href" in mark && typeof mark.href === "string") hrefs.push(mark.href);
    }
  }
  return internalLinkPaths(hrefs.map((href) => `<a href="${href.replace(/"/g, "&quot;")}"></a>`).join(""));
}

function withoutDuplicateTitle(blocks: PortableTextBlock[], title: string) {
  const first = blocks[0];
  if (!first || first._type !== "block") return blocks;
  if (first.style !== "h2" && first.style !== "h1") return blocks;
  if (!sameTitle(toPlainText(first), title)) return blocks;
  return blocks.slice(1);
}

function components(resolved: Record<string, string>): PortableTextComponents {
  return {
    block: {
      normal: ({ children }) => <p>{children}</p>,
      h2: ({ children }) => <h2>{children}</h2>,
      h3: ({ children }) => <h3>{children}</h3>,
      h4: ({ children }) => <h4>{children}</h4>,
      blockquote: ({ children }) => <blockquote>{children}</blockquote>,
    },
    list: {
      bullet: ({ children }) => <ul>{children}</ul>,
      number: ({ children }) => <ol>{children}</ol>,
    },
    marks: {
      link: ({ children, value }) => {
        const href = typeof value?.href === "string" ? value.href : "";
        const path = articleHrefPath(href);
        if (path) {
          const slug = resolved[path];
          if (!slug) return <>{children}</>;
          return <a href={articlePath(slug)}>{children}</a>;
        }
        if (!href) return <>{children}</>;
        const external = /^https?:\/\//i.test(href);
        return (
          <a href={href} {...(external ? { rel: "noreferrer", target: "_blank" } : {})}>
            {children}
          </a>
        );
      },
    },
    types: {
      image: ({ value }) => {
        const src = sanityImageSource(value);
        if (!src) return null;
        const alt = typeof value?.alt === "string" ? value.alt : "";
        return <SanityImage src={src} alt={alt} width={1200} height={675} className="article-photo" />;
      },
      tableBlock: ({ value }) => {
        const rows = Array.isArray(value?.rows) ? value.rows : [];
        return (
          <table>
            <tbody>
              {rows.map((row: { _key?: string; cells?: unknown }, index: number) => (
                <tr key={row._key || index}>
                  {(Array.isArray(row.cells) ? row.cells : []).map((cell, cellIndex) => (
                    <td key={cellIndex}>{typeof cell === "string" ? cell : ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      },
      embed: ({ value }) => {
        const url = typeof value?.url === "string" ? value.url : "";
        if (!/^https?:\/\//i.test(url)) return null;
        const title = typeof value?.title === "string" && value.title ? value.title : "Média intégré";
        return (
          <iframe
            src={url}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        );
      },
    },
  };
}

export async function ArticlePortable({ body, title }: { body: PortableTextBlock[]; title: string }) {
  const resolved = await resolveArchiveSlugs(linkProbe(body));
  const blocks = withoutDuplicateTitle(body, title);
  return (
    <div className="content article-body prose prose-invert max-w-none">
      <PortableText value={blocks} components={components(resolved)} />
    </div>
  );
}
