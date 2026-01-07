import ColorManagement from '@/components/admin/color-management';

export const metadata = {
  title: 'Manage Colors | Admin',
  description: 'Manage color options for e-cards',
};

export default function ColorsPage() {
  return (
    <div className="p-8">
      <ColorManagement />
    </div>
  );
}
