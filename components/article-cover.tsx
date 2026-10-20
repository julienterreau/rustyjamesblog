import { themeForArticle, type ThemeId } from "@/lib/themes";

function hash(value: string) {
  let n = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    n ^= value.charCodeAt(index);
    n = Math.imul(n, 16777619);
  }
  return n >>> 0;
}

function headline(title: string) {
  const clean = title.replace(/\s+/g, " ").trim();
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 34 && current) {
      lines.push(current);
      current = word;
      if (lines.length === 2) break;
    } else {
      current = next;
    }
  }
  if (lines.length < 2 && current) lines.push(current);
  const used = lines.join(" ").length;
  if (used < clean.length && lines.length) {
    const last = lines.length - 1;
    lines[last] = `${lines[last].replace(/[.…\s]+$/g, "").slice(0, 31)}…`;
  }
  return lines;
}

function Motif({ theme, seed }: { theme: ThemeId; seed: number }) {
  const shift = seed % 28;
  if (theme === "geopolitique") {
    return (
      <g fill="none" stroke="#2b2438" strokeWidth="1.5">
        <circle cx={470 + shift} cy="150" r="92" />
        <circle cx={470 + shift} cy="150" r="58" />
        <path d={`M${378 + shift} 150 H${562 + shift}`} />
        <path d={`M${470 + shift} 58 V242`} />
      </g>
    );
  }
  if (theme === "sante") {
    return (
      <g fill="none" stroke="#ef003f" strokeWidth="1.5" opacity="0.85">
        <circle cx={500 - shift} cy="148" r="70" />
        <circle cx={500 - shift} cy="148" r="28" />
        <circle cx={430 - shift} cy="188" r="18" />
        <path d={`M${500 - shift} 108 V188 M${460 - shift} 148 H${540 - shift}`} />
      </g>
    );
  }
  if (theme === "mysteres") {
    return (
      <g fill="#1d1a23" stroke="#2b2438">
        <rect x={430 + (shift % 12)} y="168" width="46" height="78" />
        <rect x="484" y="132" width="38" height="114" />
        <rect x="530" y="96" width="52" height="150" />
        <rect x="590" y="150" width="28" height="96" />
      </g>
    );
  }
  if (theme === "sciences") {
    const points = Array.from({ length: 14 }, (_, index) => {
      const x = 360 + index * 22;
      const y = 150 + Math.sin((index + shift) * 0.85) * 42;
      return `${x},${y}`;
    }).join(" ");
    return <polyline points={points} fill="none" stroke="#d7bbf8" strokeWidth="2" />;
  }
  if (theme === "spiritualite") {
    return (
      <g fill="none" stroke="#d7bbf8" strokeWidth="1.25">
        <path d={`M${500} ${70 + (shift % 10)} L560 180 L440 180 Z`} />
        <path d="M500 200 L440 90 L560 90 Z" opacity="0.7" />
      </g>
    );
  }
  if (theme === "esoterisme") {
    return (
      <g fill="none" stroke="#ef003f" strokeWidth="1.5">
        <circle cx="500" cy="156" r={64 + (shift % 8)} />
        <path d="M500 92 L556 188 H444 Z" />
      </g>
    );
  }
  if (theme === "medias") {
    return (
      <g fill="none" stroke="#f5f0e9" strokeWidth="1.5" opacity="0.55">
        <rect x="400" y="78" width="200" height="120" />
        <path d="M470 138 L530 108 V168 Z" fill="#ef003f" stroke="none" />
      </g>
    );
  }
  return (
    <g fill="#211e27">
      {Array.from({ length: 5 }, (_, index) => (
        <rect key={index} x={390 + index * 42} y={70 + ((index * 17 + shift) % 40)} width="28" height={150 - (index % 3) * 24} />
      ))}
    </g>
  );
}

export function ArticleCover({
  title,
  tags,
  slug,
}: {
  title: string;
  tags: string[];
  slug: string;
}) {
  const theme = themeForArticle(tags, title);
  const lines = headline(title);
  const seed = hash(slug || title);
  return (
    <svg className="cover-plate" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid meet" role="img" aria-label={title}>
      <rect width="640" height="360" fill="#0d0b14" />
      <rect x="0" y="0" width="8" height="360" fill="#ef003f" />
      <Motif theme={theme.id} seed={seed} />
      <text x="36" y="54" fill="#ef003f" fontFamily="var(--sans), sans-serif" fontSize="13" fontWeight="700" letterSpacing="2.4">
        {theme.code}
      </text>
      <text x="36" y="78" fill="#847a91" fontFamily="var(--sans), sans-serif" fontSize="12" letterSpacing="1.6">
        {theme.name.toLocaleUpperCase("fr-FR")}
      </text>
      <text x="36" y="250" fill="#f5f0e9" fontFamily="var(--serif), Georgia, serif" fontSize="28" fontWeight="600">
        {lines.map((line, index) => (
          <tspan key={index} x="36" dy={index === 0 ? 0 : 36}>
            {line}
          </tspan>
        ))}
      </text>
    </svg>
  );
}
