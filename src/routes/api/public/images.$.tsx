import { createFileRoute } from "@tanstack/react-router";
import { imageResponse } from "@/lib/image-response";

// Serves product and banner photos uploaded by the store owner (the storage bucket is private).
// Path validation, content type, caching and error codes live in imageResponse (tested).
async function serve(path: string, method: string) {
  const { storageDownloader } = await import("@/lib/image-storage.server");
  return imageResponse(path, await storageDownloader(), method);
}

export const Route = createFileRoute("/api/public/images/$")({
  server: {
    handlers: {
      GET: ({ params }) => serve(params._splat ?? "", "GET"),
      HEAD: ({ params }) => serve(params._splat ?? "", "HEAD"),
    },
  },
});
