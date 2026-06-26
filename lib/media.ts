export function getOptimizedMediaUrl(src: string, width: number = 800, quality: string = "auto", type: "video" | "image" = "video"): string {
  if (!src) return src;
  
  if (src.includes("res.cloudinary.com")) {
    const parts = src.split("/upload/");
    if (parts.length === 2) {
      // f_auto for format auto, q_auto for quality auto
      // c_limit to scale down if larger than width
      const params = ["f_auto", "c_limit", `w_${width}`, `q_${quality}`];
      
      // If it's a video and we want to optimize delivery, Cloudinary supports these params for video too.
      // But we might want to specify video specific params if needed. Generally f_auto,q_auto,w_ limit is enough.
      return `${parts[0]}/upload/${params.join(",")}/${parts[1]}`;
    }
  }

  return src;
}
