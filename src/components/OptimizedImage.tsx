import { useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

export default function OptimizedImage({ src, alt, className, containerClassName }: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className={cn("w-full h-full bg-secondary flex items-center justify-center", containerClassName)}>
        <span className="text-4xl">🏎️</span>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden", containerClassName)}>
      {!loaded && (
        <div className="absolute inset-0 bg-secondary/80 flex items-center justify-center">
          <span className="text-4xl animate-pulse">🏎️</span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
      />
    </div>
  );
}
