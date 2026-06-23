interface Props {
  searchParams: { error?: string };
}

import MilouLogo from "@/components/MilouLogo";

export default function LoginPage({ searchParams }: Props) {
  const hasError = searchParams.error === "1";

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#252525] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-[#1c1c1c] border-b border-[#252525] px-6 py-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-milou-500 flex items-center justify-center">
            <MilouLogo className="h-4 w-auto text-white" />
          </div>
          <span className="text-sm font-semibold text-[#e5e5e5]">Todo</span>
        </div>

        <form method="POST" action="/api/auth/login" className="p-6 flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[#e5e5e5]">Logga in</h1>
            <p className="text-sm text-[#666] mt-1">Ange lösenordet för att komma åt Todo.</p>
          </div>

          {hasError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
              Fel lösenord, försök igen.
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-[#555] uppercase tracking-wider mb-1.5">Lösenord</label>
            <input
              type="password"
              name="password"
              autoFocus
              autoComplete="current-password"
              required
              className="w-full border border-[#2d2d2d] bg-[#252525] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] focus:outline-none focus:ring-1 focus:ring-milou-500 placeholder:text-[#444]"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 rounded-lg bg-milou-500 text-white text-sm font-medium hover:bg-milou-600 transition-colors"
          >
            Logga in
          </button>
        </form>
      </div>
    </div>
  );
}
