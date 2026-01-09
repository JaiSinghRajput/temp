'use client';

import { Template } from '@/lib/types';
import { Trash2, Edit2 } from 'lucide-react';

const PRIMARY = '#d18b47';

interface AdminTemplateCardProps {
  template: Template;
  onEdit: (templateId: number) => void;
  onDelete: (templateId: number) => void;
}

export function AdminTemplateCard({
  template,
  onEdit,
  onDelete,
}: AdminTemplateCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this template permanently?')) {
      onDelete(template.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(template.id);
  };
  const getCardImage = () => {
    if (template.pages && template.pages.length > 0) {
      return template.pages[0].previewImageUrl || template.pages[0].imageUrl;
    }
    return template.thumbnail_url || template.template_image_url || null;
  }
  
  const templateName = template.title || 'Untitled';
  const templateImage = getCardImage();
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden transition hover:shadow-md w-70">
      {/* Image */}
      <div className="relative bg-gray-100 w-full">
        {templateImage ? (
          <img
            src={templateImage}
            alt={templateName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm">
            No image
          </div>
        )}

        {/* Status */}
        <div className="absolute top-3 right-3">
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${template.is_active
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
              }`}
          >
            {template.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Brand badge */}
        <div className="absolute top-3 left-3">
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{
              backgroundColor: `${PRIMARY}22`,
              color: PRIMARY,
            }}
          >
            Template
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-gray-900 font-semibold text-base leading-tight line-clamp-2">
          {templateName}
        </h3>
        {template.description &&
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {template.description || 'No description'}
          </p>
        }

        {/* Meta */}
        <div className="text-xs text-gray-500 mt-3 space-y-1">
          {template.is_multipage ?
            <div className="flex justify-between">
              <span>Total Pages</span>
              <span className="font-mono font-medium">{template?.pages?.length}</span>
            </div>
            : null
          }
          <div className="flex justify-between">
            {template.category_name && (
              <div className="flex justify-between gap-2">
                <span className="font-bold">Category</span>
                <span>{template.category_name}</span>
              </div>
            )}

            {template.subcategory_name && (
              <div className="flex justify-between gap-2">
                <span className="font-semibold">Subcategory</span>
                <span>{template.subcategory_name}</span>
              </div>
            )}
          </div>
            {/* Price */}
            {Number(template?.price ?? 0) > 0 && (
              <div className="flex justify-between gap-2">
                <span className="font-semibold">Price</span>
                <span>{template.price}</span>
              </div>
            )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={handleEdit}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition"
            style={{
              backgroundColor: `${PRIMARY}1f`,
              color: PRIMARY,
            }}
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>

          <button
            onClick={handleDelete}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>

  );
}
