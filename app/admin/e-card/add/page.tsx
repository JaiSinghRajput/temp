'use client';
import { useRouter } from 'next/navigation';
import TemplateEditor from '@/app/admin/e-card/_components/card_editor/TemplateEditor';

export default function CreateTemplatePage() {
  const router = useRouter();

  return (
    <TemplateEditor
      mode="create"
      onSave={async (payload) => {
        try {
          console.log('Saving template with payload:', payload);
          const response = await fetch('/api/e-cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          
          const result = await response.json();
          
          console.log('Save response:', response.status, result);
          
          if (result.success) {
            console.log('Template saved successfully, redirecting...');
            // Add a small delay to ensure database write
            await new Promise(resolve => setTimeout(resolve, 500));
            router.push('/admin/e-card');
          } else {
            alert(`Failed to save template: ${result.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Error saving template:', error);
          alert('Failed to save template. Please try again.');
        }
      }}
      onCancel={() => router.push('/admin')}
    />
  );
}
