import Image from "next/image";

/**
 * Brand lockup for the top nav: the SIA Partners mark from public/brand.
 * Swap the asset by replacing the file at that path — dimensions below
 * match the SVG's native aspect ratio so next/image never distorts it.
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <Image src="/brand/sia-logo.svg" alt="SIA Partners" width={54} height={15} priority className="h-6 w-auto sm:h-7" />
      <span className="hidden flex-col leading-none border-s border-border ps-3 md:flex">
        <span className="text-sm font-semibold text-ink-900">Innovation</span>
        <span className="text-[11px] text-ink-500">Professional Program</span>
      </span>
    </span>
  );
}
