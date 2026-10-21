import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";
import type { ImageLoaderProps } from "next/image";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

export function isSanityImage(src: string | null | undefined): src is string {
  return Boolean(src && (src.startsWith("image-") || src.startsWith("{")));
}

export function sanityImageSource(value: {
  asset?: { _ref?: string | null } | null;
  crop?: unknown;
  hotspot?: unknown;
} | null | undefined) {
  const ref = value?.asset?._ref;
  if (!ref) return null;
  if (!value?.crop && !value?.hotspot) return ref;
  return JSON.stringify({
    asset: { _ref: ref },
    ...(value.crop ? { crop: value.crop } : {}),
    ...(value.hotspot ? { hotspot: value.hotspot } : {}),
  });
}

function sourceFromSrc(src: string): SanityImageSource {
  if (!src.startsWith("{")) return src;
  return JSON.parse(src) as SanityImageSource;
}

export function sanityImageLoader({ src, width }: ImageLoaderProps) {
  if (!projectId || !dataset) return src;
  const source = sourceFromSrc(src);
  const builder = createImageUrlBuilder({ projectId, dataset }).image(source).width(width).auto("format");
  const hotspot = typeof source === "object" && source !== null && "hotspot" in source && source.hotspot;
  return (hotspot ? builder.fit("crop") : builder).url();
}

export function sanityImageUrl(src: string, width = 1200) {
  return sanityImageLoader({ src, width });
}
