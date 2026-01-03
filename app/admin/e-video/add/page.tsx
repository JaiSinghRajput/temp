'use client';
import VideoEditor from '../_components/VideoEditor';
export default function CreateEVideoPage() {
  return (
    <VideoEditor
      mode="create"
      onCancel={() => window.history.back()}
    />
  );
};

