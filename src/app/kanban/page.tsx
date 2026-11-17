import PageHeader from "@/components/PageHeader";
import Board from "./Board";

export default function KanbanPage() {
  return (
    <>
      <PageHeader title="Kanban" description="Korten bor i Jarvis (vaultet). Dra ett kort så sparas flytten som en commit." />
      <main className="max-w-[1400px] w-full mx-auto px-6 py-8">
        <Board />
      </main>
    </>
  );
}
