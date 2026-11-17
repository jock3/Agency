import type { CSSProperties, ReactNode } from "react";

/**
 * Kort med färgblock bakom, förskjutet nedåt till höger. Vid hover lyfter kortet
 * mot uppåt-vänster. Rörelsen stängs av vid minskad rörelse.
 */
export default function PlateCard({ color, offset = 12, lift = 4, className = "", cardClassName = "", children, style, ...rest }: {
  color: string;
  offset?: 12 | 14;
  lift?: 4 | 5;
  className?: string;
  cardClassName?: string;
  children: ReactNode;
  style?: CSSProperties;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "style" | "children">) {
  return (
    <div {...rest} style={{ ...style, paddingRight: offset, paddingBottom: offset }} className={`group relative flex ${className}`}>
      <div aria-hidden className="absolute right-0 bottom-0" style={{ left: offset, top: offset, background: color }} />
      <article className={`relative flex-1 min-w-0 bg-white transition-transform duration-200 motion-reduce:transition-none ${lift === 5 ? "group-hover:-translate-x-[5px] group-hover:-translate-y-[5px]" : "group-hover:-translate-x-1 group-hover:-translate-y-1"} motion-reduce:group-hover:transform-none ${cardClassName}`}>
        {children}
      </article>
    </div>
  );
}
