import { supabase } from "@/integrations/supabase/client";
import { IMAGE_BUCKET, imageUrlFor, storagePathFromUrl, type ImageFolder } from "@/lib/images";

export { IMAGE_ROUTE } from "@/lib/images";

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

export async function uploadPhoto(file: File, folder: ImageFolder, max = 1400): Promise<string> {
  const blob = await shrink(file, max);
  const path = `${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return imageUrlFor(path);
}

export async function deleteUploadedPhotos(urls: string[]) {
  const paths = urls.flatMap((u) => storagePathFromUrl(u) ?? []);
  if (paths.length) await supabase.storage.from(IMAGE_BUCKET).remove(paths);
}
