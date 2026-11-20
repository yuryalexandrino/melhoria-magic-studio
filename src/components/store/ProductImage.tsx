import { cn } from "@/lib/utils";
import { ShoeMark } from "./icons";

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
  return (
    <div className={cn("relative overflow-hidden bg-blush", className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          className={cn("h-full w-full object-cover", imgClassName)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <ShoeMark className="w-3/5 text-rose" />
        </div>
      )}
    </div>
  );
}
