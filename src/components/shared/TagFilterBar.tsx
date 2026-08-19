interface Props {
  tags: string[];
  activeTags: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}

export default function TagFilterBar({ tags, activeTags, onToggle, onClear }: Props) {
  if (tags.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-5">
      <span className="text-xs text-gray-400 font-medium">Filtrera:</span>
      {tags.map((tag) => {
        const active = activeTags.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggle(tag)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
              active
                ? "bg-milou-500 text-white"
                : "bg-white border border-gray-200 text-gray-500 hover:border-milou-300"
            }`}
          >
            {tag}
          </button>
        );
      })}
      {activeTags.length > 0 && (
        <button
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Rensa
        </button>
      )}
    </div>
  );
}
