/** Röd kvadrat med pil, milou.se:s knapp för "gå vidare". */
export default function ArrowSquare({
  direction = "right",
  className = "",
}: {
  direction?: "right" | "left";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center bg-milou-500 text-white transition-colors group-hover:bg-milou-600 ${className}`}
    >
      <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className={direction === "left" ? "rotate-180" : ""}>
        <path d="M0 5h14.5M10.5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    </span>
  );
}
