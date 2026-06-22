interface Props {
  searchParams: { error?: string };
}

import MilouLogo from "@/components/MilouLogo";

export default function LoginPage({ searchParams }: Props) {
  const hasError = searchParams.error === "1";

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-gray-900 px-6 py-5 flex items-center gap-3">
          <MilouLogo className="h-7 w-auto text-white" />
        </div>

        <form method="POST" action="/api/auth/login" className="p-6 flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Logga in</h1>
            <p className="text-sm text-gray-500 mt-1">Ange lösenordet för att komma åt Todo.</p>
          </div>

          {hasError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              Fel lösenord, försök igen.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lösenord</label>
            <input
              type="password"
              name="password"
              autoFocus
              autoComplete="current-password"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-milou-500"
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
