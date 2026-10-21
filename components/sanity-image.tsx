"use client";

import { sanityImageLoader } from "@/sanity/lib/image";
import Image from "next/image";

export function SanityImage({
  src,
  alt,
  width = 1200,
  height = 675,
  className,
  priority = false,
  fill = false,
  sizes = "(min-width: 980px) 750px, 100vw",
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
}) {
  if (fill) {
    return (
      <Image
        loader={sanityImageLoader}
        src={src}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        style={{ objectFit: "cover" }}
      />
    );
  }

  return (
    <Image
      loader={sanityImageLoader}
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      priority={priority}
    />
  );
}
