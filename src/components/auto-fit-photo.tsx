import Image from "next/image";

/** The sharp foreground stays complete; a decorative copy fills unused space. */
export function AutoFitPhoto({ src, alt, className = "", sizes = "100vw", priority = false }: {
  src: string; alt: string; className?: string; sizes?: string; priority?: boolean;
}) {
  return <div className={`fit-photo ${className}`}>
    <Image className="fit-photo-backdrop" src={src} alt="" aria-hidden="true" fill sizes={sizes} unoptimized referrerPolicy="no-referrer" />
    <Image className="fit-photo-original" src={src} alt={alt} fill sizes={sizes} unoptimized preload={priority} referrerPolicy="no-referrer" />
  </div>;
}
