import axiosInstance from '@/lib/axios';
import VideoEditor from '../../_components/VideoEditor';

async function fetchVideoTemplate(id: string) {
  const result = await axiosInstance.get(`/api/e-video/templates/${id}`);
  return result.data;
}

export default async function EditEVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await fetchVideoTemplate(id);

  return (
	<VideoEditor
	  mode="edit"
	  initialData={template}
	  templateId={id}
	  onCancel={() => window.history.back()}
	/>
  );
}
