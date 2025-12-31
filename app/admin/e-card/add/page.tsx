'use client';
import { useRouter } from 'next/navigation';
import TemplateEditor from '@/app/admin/e-card/_components/card_editor/TemplateEditor';

export default function CreateTemplatePage() {
  const router = useRouter();

  return (
    <TemplateEditor
      mode="create"
      onSave={async (payload) => {
        await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        router.push('/admin/e-card');
      }}
      onCancel={() => router.push('/admin')}
    />
  );
}
