"use client";

import { Check, Users, X } from "lucide-react";
import { useRef, useState } from "react";
import Popover, { PopItem } from "./Popover";
import Avatar from "./Avatar";
import type { UserOption } from "@/lib/api/todo";

interface Props {
  userId: string | null;
  users: UserOption[];
  onChange: (userId: string | null) => void;
  size?: number;
}

export default function PersonCell({ userId, users, onChange, size = 26 }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const name = users.find((u) => u.id === userId)?.name ?? null;

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={name ? "Person: " + name : "Tilldela person"}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex w-full items-center justify-center"
      >
        {name ? (
          <Avatar name={name} size={size} />
        ) : (
          <span
            className="inline-flex items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-300"
            style={{ width: size, height: size }}
          >
            <Users size={size * 0.5} strokeWidth={1.75} />
          </span>
        )}
      </button>

      {open && (
        <Popover anchorRef={ref} onClose={() => setOpen(false)} width={200}>
          {users.map((u) => (
            <PopItem
              key={u.id}
              onClick={() => {
                onChange(u.id);
                setOpen(false);
              }}
            >
              <Avatar name={u.name} size={22} />
              <span className="flex-1 truncate">{u.name}</span>
              {u.id === userId && <Check size={14} />}
            </PopItem>
          ))}
          {userId && (
            <PopItem
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <X size={13} /> Ta bort person
            </PopItem>
          )}
        </Popover>
      )}
    </>
  );
}
