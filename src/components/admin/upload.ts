import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";
export const IMAGE_ROUTE = "/api/public/images/";

/** Shrinks a photo in the browser (max side `max` px) before upload. */
async function shrink(file: File, max: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/jpeg", 0.84));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadPhoto(file: File, folder: "products" | "banner", max = 1400): Promise<string> {
  const blob = await shrink(file, max);
  const path = `${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return IMAGE_ROUTE + path;
}

export async function deleteUploadedPhotos(urls: string[]) {
  const paths = urls.filter((u) => u.startsWith(IMAGE_ROUTE)).map((u) => u.slice(IMAGE_ROUTE.length));
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}
