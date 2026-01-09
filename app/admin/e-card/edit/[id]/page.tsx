import TemplateEditor from '../../_components/card_editor/TemplateEditor';

async function fetchTemplate(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const fullUrl = `${baseUrl}/api/templates/${id}`;
  console.log('Fetching template from URL:', fullUrl);
  const res = await fetch(fullUrl, { cache: 'no-store' });
  console.log('Response status:', res.status);
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Failed to fetch template:', res.status, errorText);
    throw new Error(`Failed to fetch template: ${res.status} - ${errorText}`);
  }
  const result = await res.json();
  if (!result.success) {
    throw new Error(result.error || 'Template not found');
  }
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
