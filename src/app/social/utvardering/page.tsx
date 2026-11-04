import { aiEnabled } from "@/lib/audit/ai";
import EvaluationTool from "./EvaluationTool";

export default function EvaluationPage() {
  return (
    <main className="max-w-7xl w-full mx-auto px-6 py-8">
      <EvaluationTool aiOn={aiEnabled()} />
    </main>
  );
}
