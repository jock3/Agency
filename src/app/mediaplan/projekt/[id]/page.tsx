import ProjectStep from "./ProjectStep";

/** Steg 3: projektets årsplan och kampanjer. */
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectStep id={id} />;
}
