import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ShoeMark } from "./icons";

/** Tracks whether `src` failed to load, including failures that happened before hydration. */
function useImageFailure(src: string | undefined) {
  const ref = useRef<HTMLImageElement>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  useEffect(() => {
    const img = ref.current;
    if (src && img && img.complete && img.naturalWidth === 0) setFailedSrc(src);
  }, [src]);
  return { ref, failed: !!src && failedSrc === src, onError: () => src && setFailedSrc(src) };
}

function Placeholder({ className }: { className?: string | undefined }) {
  return (
    <div className={cn("grid place-items-center bg-blush", className)}>
      <ShoeMark className="w-3/5 text-rose" />
    </div>
  );
}

/** Drop-in <img> that shows the store's shoe mark instead of a broken image. */
export function FallbackImg({
  src,
  alt,
  className,
  loading,
}: {
  src?: string | undefined;
  alt: string;
  className?: string | undefined;
  loading?: "eager" | "lazy" | undefined;
}) {
  const { ref, failed, onError } = useImageFailure(src);
  if (!src || failed) return <Placeholder className={className} />;
  return <img ref={ref} src={src} alt={alt} loading={loading} onError={onError} className={className} />;
}

export function ProductImage({
  src,
  alt,
  className,
  imgClassName,
  eager,
}: {
  src?: string | undefined;
  alt: string;
  className?: string | undefined;
  imgClassName?: string | undefined;
  eager?: boolean | undefined;
}) {
  const { ref, failed, onError } = useImageFailure(src);
  return (
    <div className={cn("relative overflow-hidden bg-blush", className)}>
      {src && !failed ? (
        <img
          ref={ref}
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          onError={onError}
          className={cn("h-full w-full object-cover", imgClassName)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center" role={alt ? "img" : undefined} aria-label={alt || undefined}>
          <ShoeMark className="w-3/5 text-rose" />
        </div>
      )}
    </div>
  );
}
