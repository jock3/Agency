"use client";

import { hashColor, initials } from "@/lib/todo/utils";

interface Props {
  name: string | null;
  size?: number;
}

export default function Avatar({ name, size = 26 }: Props) {
  if (!name) return null;
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white"
      style={{
        width: size,
        height: size,
        background: hashColor(name),
        fontSize: Math.max(9, Math.round(size * 0.38)),
      }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, size = 22 }: { names: string[]; size?: number }) {
  if (!names.length) return null;
  return (
    <span className="flex items-center -space-x-1.5">
      {names.slice(0, 3).map((n) => (
        <Avatar key={n} name={n} size={size} />
      ))}
      {names.length > 3 && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600 ring-2 ring-white"
          style={{ width: size, height: size }}
        >
          +{names.length - 3}
        </span>
      )}
    </span>
  );
}
