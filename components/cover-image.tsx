import { SanityImage } from "@/components/sanity-image";
import { optimizedImageUrl } from "@/lib/seo";
import { isSanityImage } from "@/sanity/lib/image";

export function CoverImage({
  src,
  alt = "",
  priority = false,
  className,
  width,
  height,
  fill = false,
  bare = false,
}: {
  src: string;
  alt?: string;
  priority?: boolean;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  bare?: boolean;
}) {
  if (isSanityImage(src)) {
    return (
      <SanityImage
        src={src}
        alt={alt}
        priority={priority}
        className={className ?? (fill ? "object-cover" : undefined)}
        width={width}
        height={height}
        fill={fill}
      />
    );
  }

  const url = optimizedImageUrl(src) || src;
  if (bare) {
    return <img src={url} alt={alt} {...(priority ? { fetchPriority: "high" as const } : { loading: "lazy" as const })} />;
  }

  return (
    <img
      src={url}
      alt={alt}
      width={width}
      height={height}
      className={className}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
    />
  );
}
