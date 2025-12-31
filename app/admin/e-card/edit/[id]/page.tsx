import TemplateEditor from '../../_components/card_editor/TemplateEditor';

async function fetchTemplate(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/templates/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch template');
  }
  const result = await res.json();
  return result.data;
}

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await fetchTemplate(id);

  return (
    <TemplateEditor
      mode="edit"
      initialData={template}
      templateId={id}
    />
  );
}
