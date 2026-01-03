'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/lib/axios';
import { AdminHeader } from '@/components/admin/admin-header';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { CardSidebar } from './CardSidebar';
import { CardEditor } from './CardEditor';
import { CardDraft } from './types';
import { createEmptyCard, createEmptyField } from './utils';
import { VideoCategory, VideoSubcategory } from '@/lib/types';

type EditorMode = 'create' | 'edit';

interface VideoEditorProps {
    mode: EditorMode;
    initialData?: any | null;
    templateId?: string;
    onSave?: (payload: any) => Promise<void>;
    onCancel?: () => void;
}

export default function VideoEditor({
    mode,
    initialData,
    templateId,
    onSave,
    onCancel,
}: VideoEditorProps) {
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState<string>('');
    const [previewVideoUrl, setPreviewVideoUrl] = useState('');
    const [previewVideoPublicId, setPreviewVideoPublicId] = useState<string | null>(null);
    const [previewThumbUrl, setPreviewThumbUrl] = useState('');
    const [previewThumbPublicId, setPreviewThumbPublicId] = useState<string | null>(null);

    const [categories, setCategories] = useState<VideoCategory[]>([]);
    const [subcategories, setSubcategories] = useState<VideoSubcategory[]>([]);
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [subcategoryId, setSubcategoryId] = useState<number | null>(null);

    const [cards, setCards] = useState<CardDraft[]>([createEmptyCard(0)]);
    const [activeCardId, setActiveCardId] = useState<string>('card-1');

    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [uploadingThumb, setUploadingThumb] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(mode === 'edit');
    const [error, setError] = useState<string | null>(null);

    const activeCard = cards.find((c) => c.id === activeCardId) || cards[0];

    // Load initial data for edit mode
    useEffect(() => {
        if (mode === 'edit' && initialData) {
            setTitle(initialData.title || '');
            setDescription(initialData.description || '');
            setPrice(initialData.price ? String(initialData.price) : '');
            setPreviewVideoUrl(initialData.preview_video_url || '');
            setPreviewVideoPublicId(initialData.preview_video_public_id || null);
            setPreviewThumbUrl(initialData.preview_thumbnail_url || '');
            setPreviewThumbPublicId(initialData.preview_thumbnail_public_id || null);
            setCategoryId(initialData.category_id || null);
            setSubcategoryId(initialData.subcategory_id || null);

            if (initialData.cards && Array.isArray(initialData.cards)) {
                const loadedCards: CardDraft[] = initialData.cards.map((card: any, idx: number) => ({
                    id: `card-${idx + 1}`,
                    sort_order: card.sort_order ?? idx,
                    card_image_url: card.card_image_url || '',
                    card_image_public_id: card.card_image_public_id || null,
                    fields: (card.fields || []).map((field: any, fieldIdx: number) => ({
                        name: field.name || '',
                        label: field.label || '',
                        field_type: field.field_type || 'text',
                        required: field.required || false,
                        helper_text: field.helper_text || '',
                        options: Array.isArray(field.options) ? field.options.join(', ') : field.options || '',
                        sort_order: field.sort_order ?? fieldIdx,
                    })),
                }));
                setCards(loadedCards);
                setActiveCardId(loadedCards[0]?.id || 'card-1');
            }

            setLoading(false);
        }
    }, [mode, initialData]);

    // Load categories and subcategories
    useEffect(() => {
        const loadCats = async () => {
            try {
                const [catRes, subRes] = await Promise.all([
                    axiosInstance.get('/api/video-categories'),
                    axiosInstance.get('/api/video-subcategories'),
                ]);
                if (catRes.data.success) setCategories(catRes.data.data || []);
                if (subRes.data.success) setSubcategories(subRes.data.data || []);
            } catch (err) {
                console.error('Failed to load video categories', err);
            }
        };
        loadCats();
    }, []);

    const handleAddCard = () => {
        setCards((prev) => {
            const next = [...prev, createEmptyCard(prev.length)];
            setActiveCardId(next[next.length - 1].id);
            return next;
        });
    };

    const handleUpdateCard = (cardId: string, patch: Partial<CardDraft>) => {
        setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...patch } : c)));
    };

    const handleRemoveCard = (cardId: string) => {
        setCards((prev) => {
            if (prev.length === 1) return prev;
            const next = prev.filter((c) => c.id !== cardId);
            if (cardId === activeCardId && next[0]) {
                setActiveCardId(next[0].id);
            }
            return next;
        });
    };

    const handleAddField = (cardId: string) => {
        setCards((prev) =>
            prev.map((c) =>
                c.id === cardId
                    ? { ...c, fields: [...c.fields, createEmptyField(c.fields.length)] }
                    : c
            )
        );
    };

    const handleUpdateField = (cardId: string, index: number, patch: Partial<CardDraft['fields'][number]>) => {
        setCards((prev) =>
            prev.map((c) =>
                c.id === cardId
                    ? {
                        ...c,
                        fields: c.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)),
                    }
                    : c
            )
        );
    };

    const handleRemoveField = (cardId: string, index: number) => {
        setCards((prev) =>
            prev.map((c) =>
                c.id === cardId ? { ...c, fields: c.fields.filter((_, i) => i !== index) } : c
            )
        );
    };

    const handlePreviewVideoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingVideo(true);
        setError(null);
        try {
            const res = await uploadToCloudinary(file);
            setPreviewVideoUrl(res.secureUrl);
            setPreviewVideoPublicId(res.publicId || null);
            if (!previewThumbUrl && res.thumbnailUrl) {
                setPreviewThumbUrl(res.thumbnailUrl);
            }
        } catch (err: any) {
            setError(err?.message || 'Video upload failed');
        } finally {
            setUploadingVideo(false);
        }
    };

    const handleThumbUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingThumb(true);
        setError(null);
        try {
            const res = await uploadToCloudinary(file);
            setPreviewThumbUrl(res.thumbnailUrl || res.secureUrl);
            setPreviewThumbPublicId(res.publicId || null);
        } catch (err: any) {
            setError(err?.message || 'Thumbnail upload failed');
        } finally {
            setUploadingThumb(false);
        }
    };

    const handleSubmit = async () => {
        if (!title || !previewVideoUrl) {
            setError('Title and preview video are required');
            return;
        }
        if (!cards.length) {
            setError('Add at least one card with its fields');
            return;
        }

        const priceValue = price !== '' ? Number(price) : null;
        if (price !== '' && Number.isNaN(priceValue)) {
            setError('Price must be a valid number');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const payload = {
                title,
                description: description || null,
                price: priceValue,
                preview_video_url: previewVideoUrl,
                preview_video_public_id: previewVideoPublicId,
                preview_thumbnail_url: previewThumbUrl || null,
                preview_thumbnail_public_id: previewThumbPublicId,
                category_id: categoryId,
                subcategory_id: subcategoryId,
                cards: cards.map((card, cardIdx) => ({
                    card_image_url: card.card_image_url || null,
                    card_image_public_id: card.card_image_public_id || null,
                    sort_order: card.sort_order ?? cardIdx,
                    fields: card.fields.map((f, fieldIdx) => ({
                        name: f.name.trim(),
                        label: f.label.trim(),
                        field_type: f.field_type,
                        required: f.required,
                        helper_text: f.helper_text?.trim() || null,
                        options:
                            f.field_type === 'select'
                                ? f.options
                                    ?.split(',')
                                    .map((s) => s.trim())
                                    .filter(Boolean) || []
                                : null,
                        sort_order: f.sort_order ?? fieldIdx,
                    })),
                })),
            };

            if (onSave) {
                await onSave(payload);
                return;
            }

            const method = mode === 'create' ? 'POST' : 'PUT';
            const url = mode === 'create' ? '/api/e-video/templates' : `/api/e-video/templates/${templateId}`;

            const res = await axiosInstance({
                method,
                url,
                data: payload,
            });

            if (res.data.success) {
                router.push('/admin/e-video');
            } else {
                setError(res.data.error || `Failed to ${mode === 'create' ? 'create' : 'update'} e-video`);
            }
        } catch (err) {
            setError(`Failed to ${mode === 'create' ? 'create' : 'update'} e-video template`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            router.push(mode === 'create' ? '/admin' : '/admin/e-video');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-sm text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            <AdminHeader
                title={mode === 'create' ? 'Create E-Video Invite' : 'Edit E-Video Invite'}
                subtitle={mode === 'create' ? 'Define the preview, cards, and required information' : 'Update the template details'}
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
                        {error}
                    </div>
                )}

                <section className="grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between max-w-xl">
                            <h2 className="text-sm font-semibold text-gray-900">Preview Video</h2>
                            {uploadingVideo && (
                                <span className="text-xs text-gray-500">Uploading…</span>
                            )}
                        </div>
                        <div className="space-y-2">
                            <input
                                type="file"
                                accept="video/*"
                                onChange={handlePreviewVideoUpload}
                                className="text-sm"
                            />
                            <input
                                value={previewVideoUrl}
                                onChange={(e) => setPreviewVideoUrl(e.target.value)}
                                className="w-full rounded-md border px-3 py-2 text-sm"
                                placeholder="Or paste video URL"
                            />
                        </div>
                        {previewVideoUrl && (
                            <div className="w-full max-w-xs border rounded-md overflow-hidden bg-black mx-auto">
                                <video
                                    src={previewVideoUrl}
                                    controls
                                    className="w-full object-contain"
                                />
                            </div>

                        )}
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-3 md:col-span-1">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-gray-900">Preview Thumbnail</label>
                                {uploadingThumb && (
                                    <span className="text-xs text-gray-500">Uploading…</span>
                                )}
                            </div>
                            <div className='space-y-2'>

                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleThumbUpload}
                                    className="text-sm"
                                />
                                <input
                                    value={previewThumbUrl}
                                    onChange={(e) => setPreviewThumbUrl(e.target.value)}
                                    className="w-full rounded-md border px-3 py-2 text-sm"
                                    placeholder="Or paste image URL"
                                />
                            </div>
                            {previewThumbUrl && (
                                <img
                                    src={previewThumbUrl}
                                    alt="Thumbnail preview"
                                    className="w-full rounded-lg border"
                                />
                            )}
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-3 md:col-span-1">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-700">Category</label>
                            <select
                                value={categoryId ?? ''}
                                onChange={(e) => {
                                    const val = e.target.value ? Number(e.target.value) : null;
                                    setCategoryId(val);
                                    setSubcategoryId(null);
                                }}
                                className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                            >
                                <option value="">Select category</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-700">Subcategory</label>
                            <select
                                value={subcategoryId ?? ''}
                                onChange={(e) => setSubcategoryId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                                disabled={!categoryId}
                            >
                                <option value="">Select subcategory</option>
                                {subcategories
                                    .filter((s) => !categoryId || s.category_id === categoryId)
                                    .map((sub) => (
                                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                                    ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-700">Title *</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full rounded-md border px-3 py-2 text-sm"
                                placeholder="Wedding invite"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-700">Price</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full rounded-md border px-3 py-2 text-sm"
                                placeholder="Ex: 499"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-700">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full rounded-md border px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                </section>

                <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">Cards & Fields</h2>
                            <p className="text-xs text-gray-500">Each card has its own preview image and inputs.</p>
                        </div>
                        {cards.length > 1 && (
                            <button
                                onClick={() => handleRemoveCard(activeCard?.id || '')}
                                className="text-xs text-red-600 hover:underline"
                            >
                                Remove current card
                            </button>
                        )}
                    </div>

                    <div className="flex">
                        <CardSidebar
                            cards={cards}
                            activeCardId={activeCard?.id || ''}
                            onSelect={setActiveCardId}
                            onAdd={handleAddCard}
                        />

                        <div className="flex-1 p-6">
                            {activeCard ? (
                                <CardEditor
                                    card={activeCard}
                                    onUpdate={(patch) => handleUpdateCard(activeCard.id, patch)}
                                    onAddField={() => handleAddField(activeCard.id)}
                                    onUpdateField={(index, patch) => handleUpdateField(activeCard.id, index, patch)}
                                    onRemoveField={(index) => handleRemoveField(activeCard.id, index)}
                                />
                            ) : (
                                <div className="text-sm text-gray-500">No card selected.</div>
                            )}
                        </div>
                    </div>
                </section>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={handleCancel}
                        className="px-6 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 py-2 rounded-md bg-primary text-white text-sm font-semibold disabled:opacity-60"
                    >
                        {submitting ? 'Saving…' : 'Save Template'}
                    </button>
                </div>
            </div>
        </div>
    );
}
