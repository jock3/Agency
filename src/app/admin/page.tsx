import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { currentUserWithTools } from "@/lib/access/current";
import { listControlUsers } from "@/lib/admin/control";
import NewUserForm from "./NewUserForm";
import UserCard from "./UserCard";

export const dynamic = "force-dynamic";

/** Kontrollcentret: användare, roller, verktygsåtkomst och PIN-koder. Bara admin. */
export default async function ControlCenterPage() {
  const me = await currentUserWithTools();
  if (!me) redirect("/login");
  if (!me.is_admin) redirect("/");

  const users = await listControlUsers();

  return (
    <main className="flex-1 bg-gray-50">
      <PageHeader title="Kontrollcenter" description="Bestäm vem som får använda vilka verktyg, byt PIN-kod åt den som glömt sin och ändra roller." />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <NewUserForm />
        <h2 className="mt-10 mb-3 font-bold">Användare ({users.length})</h2>
        <ul className="grid gap-3 lg:grid-cols-2">
          {users.map((u) => (
            <UserCard key={u.id} user={u} isMe={u.id === me.user_id} />
          ))}
        </ul>
      </div>
    </main>
  );
}
