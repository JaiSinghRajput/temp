import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function buildUrl(video: {
  slug: string;
  category_slug?: string | null;
  subcategory_slug?: string | null;
}): string {
  const parts = ["/e-videos"];
  if (video.category_slug) parts.push(video.category_slug);
  if (video.subcategory_slug) parts.push(video.subcategory_slug);
  parts.push(video.slug);
  return parts.join("/");
}
