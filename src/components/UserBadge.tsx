"use client";

import { useEffect, useState } from "react";
import type { AppUser } from "@/lib/types";

export default function UserBadge() {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  return (
    <div className="flex items-center gap-3">
      {user && (
        <span className="text-sm text-gray-400">
          {user.name}
          {user.isAdmin && <span className="ml-1.5 text-xs text-milou-400 font-medium">· Admin</span>}
        </span>
      )}
      {user?.isAdmin && (
        <a href="/admin" className="text-sm text-gray-400 hover:text-white transition-colors">
          Admin
        </a>
      )}
      <a href="/api/auth/logout" className="text-sm text-gray-400 hover:text-white transition-colors">
        Logga ut
      </a>
    </div>
  );
}
