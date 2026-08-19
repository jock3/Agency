"use client";

import { useEffect, useState, useCallback } from "react";
import MilouLogo from "@/components/MilouLogo";
import UserBadge from "@/components/UserBadge";
import type { AppUser } from "@/lib/types";
import type { AdminUserRow } from "@/lib/auth/session";

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<AppUser | null | undefined>(undefined);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/auth/admin/users");
    const data = await res.json();
    if (data.ok) {
      setUsers(data.users);
    } else {
      setError(data.error ?? "Kunde inte hämta användare.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => setCurrentUser(data.user));
  }, []);

  useEffect(() => {
    if (currentUser?.isAdmin) load();
  }, [currentUser, load]);

  const handleUnlock = async (userId: string) => {
    await fetch("/api/auth/admin/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    load();
  };

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    await fetch("/api/auth/admin/set-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isAdmin }),
    });
    load();
  };

  const isLocked = (u: AdminUserRow) => u.locked_until && new Date(u.locked_until) > new Date();

  if (currentUser === undefined) return null;

  if (currentUser === null || !currentUser.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Du har inte behörighet att se den här sidan.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-6">
          <MilouLogo className="h-7 w-auto text-white" />
          <span className="px-3 py-1.5 text-sm text-white bg-white/10 rounded-lg font-medium">Admin</span>
        </div>
        <UserBadge />
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Användare</h1>
        <p className="text-sm text-gray-500 mb-6">Lås upp konton eller ge/ta bort adminbehörighet.</p>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-white rounded-lg border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">{u.name}</span>
                    {u.is_admin && (
                      <span className="text-xs text-milou-600 bg-milou-50 px-1.5 py-0.5 rounded-full font-medium">Admin</span>
                    )}
                    {isLocked(u) && (
                      <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full font-medium">Låst</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {u.failed_attempts} felaktiga försök
                    {isLocked(u) && u.locked_until ? ` · låst till ${new Date(u.locked_until).toLocaleString("sv-SE")}` : ""}
                  </span>
                </div>

                {isLocked(u) && (
                  <button
                    onClick={() => handleUnlock(u.id)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    Lås upp
                  </button>
                )}

                <button
                  onClick={() => handleToggleAdmin(u.id, !u.is_admin)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  {u.is_admin ? "Ta bort admin" : "Gör till admin"}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
