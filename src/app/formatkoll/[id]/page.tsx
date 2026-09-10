import FormatkollEditor from "./FormatkollEditor";

export default async function FormatkollProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FormatkollEditor projectId={id} />;
}
