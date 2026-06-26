"use client";

export default function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  // Check if it's a Cloudinary URL
  if (src.includes("res.cloudinary.com")) {
    const parts = src.split("/upload/");
    if (parts.length === 2) {
      // If there are already transformations in the URL (e.g. if the DB saved it with them),
      // we don't want to mess it up. But typically, DB saves the direct URL.
      // We insert our optimization parameters right after /upload/
      const params = ["f_auto", "c_limit", `w_${width}`, `q_${quality || "auto"}`];
      return `${parts[0]}/upload/${params.join(",")}/${parts[1]}`;
    }
  }

  // Fallback for local images or other URLs
  return src;
}
