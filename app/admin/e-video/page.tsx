'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/lib/axios';
import { AdminHeader } from '@/components/admin/admin-header';
import { VideoInviteTemplate } from '@/lib/types';

const PRIMARY = '#d18b47';

export default function AdminEVideoListPage() {
  const [templates, setTemplates] = useState<VideoInviteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get('/api/e-video/templates');
        if (res.data.success) {
          setTemplates(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load e-video templates', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCreate = () => router.push('/admin/e-video/add');

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this video template permanently?')) return;
    try {
      await axiosInstance.delete(`/api/e-video/templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert('Failed to delete template');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title="E-Video"
        subtitle="Manage vertical video invite templates"
      />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Templates</h2>
            <p className="text-sm text-gray-500">
              Vertical video invite configurations
            </p>
          </div>

          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium text-white rounded-md"
            style={{ backgroundColor: PRIMARY }}
          >
            Create
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-16 text-sm text-gray-500 text-center">
            Loading templates…
          </div>
        ) : templates.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500 border border-gray-200 bg-white rounded-md">
            No video invite templates created yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tmpl) => {
              const poster =
                tmpl.preview_thumbnail_url ||
                tmpl.cards?.[0]?.card_image_url ||
                undefined;

              const fieldCount =
                tmpl.cards?.reduce(
                  (sum, card) => sum + (card.fields?.length || 0),
                  0
                ) || 0;

              return (
                <div
                  key={tmpl.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition"
                >
                  {/* Video preview */}
                  <div className="relative bg-black flex justify-center border-b">
                    <div className="w-full max-w-55 aspect-9/16 max-h-90">
                      <video
                        src={tmpl.preview_video_url}
                        poster={poster}
                        controls
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain bg-black"
                      />
                    </div>

                    <div className="absolute bottom-2 left-2 text-xs px-2 py-1 rounded-full bg-black/70 text-white">
                      {fieldCount} fields
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {tmpl.title}
                      </h3>
                      <span className="text-[11px] text-gray-500">
                        /{tmpl.slug}
                      </span>
                    </div>

                    {tmpl.price !== null && typeof tmpl.price !== 'undefined' && (
                      <p className="text-sm font-semibold text-gray-900">
                        ₹{tmpl.price}
                      </p>
                    )}

                    {tmpl.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {tmpl.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-4 py-3 border-t flex items-center justify-between text-sm">
                    <button
                      onClick={() =>
                        router.push(`/admin/e-video/edit/${tmpl.slug}`)
                      }
                      className="font-medium"
                      style={{ color: PRIMARY }}
                    >
                      Edit
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          router.push(
                            `/e-videos/${tmpl.category_slug || ''}/${tmpl.subcategory_slug || ''}/${tmpl.slug}`
                          )
                        }
                        className="text-gray-600 hover:text-gray-900"
                      >
                        View
                      </button>

                      <button
                        onClick={() => handleDelete(tmpl.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
