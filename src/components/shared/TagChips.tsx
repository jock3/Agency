export default function TagChips({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="text-[11px] font-medium bg-milou-100 text-milou-700 px-1.5 py-0.5 rounded"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
