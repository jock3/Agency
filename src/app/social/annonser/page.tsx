import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import { adminOverview, companiesOf, currentUser } from "@/lib/ads/access";
import MemberEditor from "./MemberEditor";
import NewCompanyForm from "./NewCompanyForm";

/**
 * Annonsverktygets startsida: företagen du är medlem i. En admin ser dessutom
 * en administrationsdel där företag skapas och medlemmar hanteras.
 */
export default async function AdsHomePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [mine, overview] = await Promise.all([companiesOf(user.user_id), user.is_admin ? adminOverview() : Promise.resolve(null)]);

  return (
    <main className="max-w-6xl w-full mx-auto px-6 py-8">
      <h2 className="text-2xl font-bold">Annonsverktyg</h2>
      <p className="text-sm text-gray-600 mt-1 max-w-[70ch]">
        Skriv ett budskap och få en färdig annons i varumärkets stil. Verktyget byggs i steg. Just nu finns företag och åtkomst på plats.
      </p>

      <section className="mt-8">
        <h3 className="font-bold mb-2">Dina företag ({mine.length})</h3>
        {mine.length === 0 ? (
          <p className="bg-white px-5 py-6 text-gray-700 max-w-[70ch]">
            Du är inte medlem i något företag än. {user.is_admin ? "Skapa ett nedan." : "Be en admin lägga till dig."}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/social/annonser/${c.id}`}
                  className="flex items-center gap-3 bg-white px-5 py-4 hover:bg-peach/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
                >
                  <Building2 className="w-5 h-5 text-milou-500 shrink-0" aria-hidden />
                  <span className="font-bold flex-1 min-w-0 truncate">{c.name}</span>
                  <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {overview && (
        <section className="mt-12">
          <h3 className="font-bold mb-1">Administration</h3>
          <p className="text-sm text-gray-600 mb-4 max-w-[70ch]">
            Bara admin ser den här delen. Du kan lägga till och ta bort medlemmar, men du ser ett företags innehåll först när du själv är medlem.
            Användare skapas på <Link href="/admin" className="underline hover:text-milou-500">Admin</Link>.
          </p>
          <NewCompanyForm />
          {overview.companies.length > 0 && (
            <ul className="mt-6 space-y-3">
              {overview.companies.map(({ company, members }) => (
                <li key={company.id} className="bg-white px-5 py-4">
                  <h4 className="font-bold">{company.name}</h4>
                  <MemberEditor companyId={company.id} members={members} users={overview.users} />
                </li>
              ))}
            </ul>
          )}

          <h4 className="font-bold mt-10 mb-2">Användare ({overview.users.length})</h4>
          <table className="w-full text-sm bg-white">
            <thead className="text-left text-gray-600 border-b border-gray-200">
              <tr>
                <th className="py-2 px-4 font-normal">Namn</th>
                <th className="py-2 px-4 font-normal">Roll</th>
                <th className="py-2 px-4 font-normal">Företag</th>
              </tr>
            </thead>
            <tbody>
              {overview.users.map((u) => {
                const companies = overview.companies.filter((c) => c.members.some((m) => m.id === u.id)).map((c) => c.company.name);
                return (
                  <tr key={u.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-2 px-4 font-bold">{u.name}</td>
                    <td className="py-2 px-4">{u.is_admin ? "Admin" : "Användare"}</td>
                    <td className="py-2 px-4 text-gray-700">{companies.join(", ") || <span className="text-gray-600">Inget företag</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-600">Nya användare skapas på Admin.</p>
        </section>
      )}
    </main>
  );
}
