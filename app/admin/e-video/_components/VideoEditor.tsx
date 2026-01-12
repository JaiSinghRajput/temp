'use client';

import React, { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/lib/axios';
import { AdminHeader } from '@/components/admin/admin-header';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { CardSidebar } from './CardSidebar';
import { CardEditor } from './CardEditor';
import { CardDraft } from './types';
import { createEmptyCard, createEmptyField } from './utils';
import { VideoCategory, VideoSubcategory } from '@/lib/types';
import { MAX_IMAGE_MB, MAX_VIDEO_MB } from '@/lib/constants';
import { LinkIcon, UploadIcon } from '@/components/ui/Icon';
type EditorMode = 'create' | 'edit';

interface VideoEditorProps {
    mode: EditorMode;
    initialData?: any | null;
    templateId?: string;
    onSave?: (payload: any) => Promise<void>;
    onCancel?: () => void;
}

const PRIMARY = '#d66e4b';

type UploadMode = 'upload' | 'url';

function UploaderBox({
    title,
    subtitle,
    accept,
    uploading,
    value,
    onValue,
    onFile,
    preview,
    allowClear = true,
}: {
    title: string;
    subtitle?: string;
    accept: string;
    uploading?: boolean;
    value: string;
    onValue: (v: string) => void;
    onFile: (e: ChangeEvent<HTMLInputElement>) => void;
    preview?: React.ReactNode;
    allowClear?: boolean;
}) {
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [mode, setMode] = useState<UploadMode>('upload');

    useEffect(() => {
        if (value?.trim()) setMode('url');
    }, [value]);

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
                    {subtitle ? <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p> : null}
                </div>

                <div className="flex items-center gap-3">
                    {uploading ? <span className="text-xs text-gray-500">Uploading…</span> : null}

                    {allowClear && value ? (
                        <button
                            type="button"
                            onClick={() => onValue('')}
                            className="text-xs font-semibold text-gray-500 hover:text-gray-900"
                        >
                            Clear
                        </button>
                    ) : null}
                </div>
            </div>

            {/* toggle */}
            <div className="rounded-2xl border bg-white p-2 shadow-sm" style={{ borderColor: 'rgba(0,0,0,0.10)' }}>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setMode('upload')}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2 transition"
                        style={{
                            borderColor: mode === 'upload' ? PRIMARY : 'rgba(0,0,0,0.10)',
                            backgroundColor: mode === 'upload' ? 'rgba(214,110,75,0.12)' : 'white',
                            color: mode === 'upload' ? PRIMARY : '#111827',
                        }}
                    >
                        <UploadIcon className="w-4 h-4" />
                        Upload
                    </button>

                    <button
                        type="button"
                        onClick={() => setMode('url')}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2 transition"
                        style={{
                            borderColor: mode === 'url' ? PRIMARY : 'rgba(0,0,0,0.10)',
                            backgroundColor: mode === 'url' ? 'rgba(214,110,75,0.12)' : 'white',
                            color: mode === 'url' ? PRIMARY : '#111827',
                        }}
                    >
                        <LinkIcon className="w-4 h-4" />
                        URL
                    </button>
                </div>
            </div>

            {/* hidden file input */}
            <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={onFile} />

            {/* upload mode */}
            {mode === 'upload' && (
                <div
                    onClick={() => fileRef.current?.click()}
                    className="cursor-pointer rounded-2xl border bg-white p-4 transition hover:shadow-md"
                    style={{
                        borderColor: 'rgba(0,0,0,0.10)',
                        boxShadow: uploading ? `0 0 0 4px rgba(214,110,75,0.18)` : undefined,
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(214,110,75,0.12)', color: PRIMARY }}
                        >
                            <UploadIcon />
                        </div>

                        <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{uploading ? 'Uploading...' : 'Click to upload'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Choose a file from your system</p>
                        </div>

                        <span
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                            style={{ backgroundColor: uploading ? 'rgba(0,0,0,0.35)' : PRIMARY }}
                        >
                            {uploading ? 'Wait' : 'Browse'}
                        </span>
                    </div>

                    {uploading && (
                        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full w-2/3 animate-pulse rounded-full" style={{ backgroundColor: PRIMARY }} />
                        </div>
                    )}
                </div>
            )}

            {/* url mode */}
            {mode === 'url' && (
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600">Paste URL</label>
                    <input
                        value={value}
                        onChange={(e) => onValue(e.target.value)}
                        className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none"
                        style={{ borderColor: 'rgba(0,0,0,0.10)' }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = PRIMARY;
                            e.currentTarget.style.boxShadow = `0 0 0 4px rgba(214,110,75,0.20)`;
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)';
                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
                        }}
                        placeholder="https://..."
                    />
                </div>
            )}

            {/* preview */}
            {value && preview ? (
                <div className="rounded-2xl border bg-white p-3 shadow-sm" style={{ borderColor: 'rgba(0,0,0,0.10)' }}>
                    <div className="text-xs font-semibold text-gray-600 mb-2">Preview</div>
                    {preview}
                </div>
            ) : null}
        </div>
    );
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
                c.id === cardId ? { ...c, fields: [...c.fields, createEmptyField(c.fields.length)] } : c
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
            prev.map((c) => (c.id === cardId ? { ...c, fields: c.fields.filter((_, i) => i !== index) } : c))
        );
    };

    const handlePreviewVideoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxVideoBytes = MAX_VIDEO_MB * 1024 * 1024;
        if (file.size > maxVideoBytes) {
            setError(
                `Video file too large. Max ${MAX_VIDEO_MB}MB allowed. Your file is ${(file.size / 1024 / 1024).toFixed(
                    2
                )}MB`
            );
            return;
        }

        setUploadingVideo(true);
        setError(null);
        try {
            const res = await uploadToCloudinary(file);

            // ✅ ONLY set video
            setPreviewVideoUrl(res.secureUrl);
            setPreviewVideoPublicId(res.publicId || null);

            // ❌ DO NOT set thumbnail here
            // setPreviewThumbUrl(...)
        } catch (err: any) {
            console.error('Video upload error:', err);
            setError(err?.message || 'Video upload failed');
        } finally {
            setUploadingVideo(false);
        }
    };


    const handleThumbUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxImageBytes = MAX_IMAGE_MB * 1024 * 1024;
        if (file.size > maxImageBytes) {
            setError(
                `Image file too large. Max ${MAX_IMAGE_MB}MB allowed. Your file is ${(file.size / 1024 / 1024).toFixed(
                    2
                )}MB`
            );
            return;
        }

        setUploadingThumb(true);
        setError(null);
        try {
            const res = await uploadToCloudinary(file);
            setPreviewThumbUrl(res.thumbnailUrl || res.secureUrl);
            setPreviewThumbPublicId(res.publicId || null);
        } catch (err: any) {
            console.error('Thumbnail upload error:', err);
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
                ...(mode === 'edit' ? { id: initialData?.id } : {}),
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

            if (mode === 'edit' && !payload.id) {
                setError('Missing template id for update');
                setSubmitting(false);
                return;
            }

            if (onSave) {
                await onSave(payload);
                return;
            }

            const method = mode === 'create' ? 'POST' : 'PUT';
            const url = '/api/e-video/templates';

            const res = await axiosInstance({
                method,
                url,
                data: payload,
            });

            if (res.data.success) {
                router.push('/admin/e-video');
                router.refresh();
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
                    <div
                        className="rounded-2xl border px-4 py-3 text-sm shadow-sm"
                        style={{
                            borderColor: 'rgba(239,68,68,0.35)',
                            backgroundColor: 'rgba(239,68,68,0.08)',
                            color: '#b91c1c',
                        }}
                    >
                        <div className="font-semibold">Something went wrong</div>
                        <div className="text-xs mt-1">{error}</div>
                    </div>
                )}

                {/* top 3 cards */}
                <section className="grid gap-4 md:grid-cols-3">
                    <UploaderBox
                        title="Preview Video"
                        subtitle={`Max size: ${MAX_VIDEO_MB}MB`}
                        accept="video/*"
                        uploading={uploadingVideo}
                        value={previewVideoUrl}
                        onValue={setPreviewVideoUrl}
                        onFile={handlePreviewVideoUpload}
                        preview={
                            <div className="w-full border rounded-xl overflow-hidden bg-black">
                                <video src={previewVideoUrl} controls className="w-full object-contain" />
                            </div>
                        }
                    />

                    <UploaderBox
                        title="Preview Thumbnail"
                        subtitle={`Max size: ${MAX_IMAGE_MB}MB`}
                        accept="image/*"
                        uploading={uploadingThumb}
                        value={previewThumbUrl}
                        onValue={setPreviewThumbUrl}
                        onFile={handleThumbUpload}
                        preview={
                            <img
                                src={previewThumbUrl}
                                alt="Thumbnail preview"
                                className="w-full rounded-xl border object-cover"
                                style={{ borderColor: 'rgba(0,0,0,0.08)' }}
                            />
                        }
                    />

                    {/* details */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">Template Details</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Categorize and configure pricing and description.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-600">Category</label>
                            <select
                                value={categoryId ?? ''}
                                onChange={(e) => {
                                    const val = e.target.value ? Number(e.target.value) : null;
                                    setCategoryId(val);
                                    setSubcategoryId(null);
                                }}
                                className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none"
                                style={{ borderColor: 'rgba(0,0,0,0.10)' }}
                            >
                                <option value="">Select category</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-600">Subcategory</label>
                            <select
                                value={subcategoryId ?? ''}
                                onChange={(e) => setSubcategoryId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none disabled:opacity-60"
                                style={{ borderColor: 'rgba(0,0,0,0.10)' }}
                                disabled={!categoryId}
                            >
                                <option value="">Select subcategory</option>
                                {subcategories
                                    .filter((s) => !categoryId || s.category_id === categoryId)
                                    .map((sub) => (
                                        <option key={sub.id} value={sub.id}>
                                            {sub.name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-600">
                                Title <span style={{ color: PRIMARY }}>*</span>
                            </label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none"
                                style={{ borderColor: 'rgba(0,0,0,0.10)' }}
                                placeholder="Wedding invite"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-600">Price</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none"
                                style={{ borderColor: 'rgba(0,0,0,0.10)' }}
                                placeholder="Ex: 499"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-600">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none resize-none"
                                style={{ borderColor: 'rgba(0,0,0,0.10)' }}
                                placeholder="Describe this template..."
                            />
                        </div>
                    </div>
                </section>

                {/* cards & fields */}
                <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">Cards & Fields</h2>
                            <p className="text-xs text-gray-500">Each card has its own preview image and inputs.</p>
                        </div>

                        {cards.length > 1 && (
                            <button
                                onClick={() => handleRemoveCard(activeCard?.id || '')}
                                className="rounded-xl border px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 active:scale-[0.98]"
                                style={{ borderColor: 'rgba(239,68,68,0.35)' }}
                            >
                                Remove current card
                            </button>
                        )}
                    </div>

                    <div className="flex">
                        <CardSidebar cards={cards} activeCardId={activeCard?.id || ''} onSelect={setActiveCardId} onAdd={handleAddCard} />

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

                {/* footer buttons */}
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={handleCancel}
                        className="px-6 py-2.5 rounded-xl border text-gray-700 text-sm font-semibold hover:bg-gray-50 active:scale-[0.98]"
                        style={{ borderColor: 'rgba(0,0,0,0.15)' }}
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm disabled:opacity-60 active:scale-[0.98]"
                        style={{
                            backgroundColor: PRIMARY,
                            boxShadow: '0 10px 20px rgba(214,110,75,0.25)',
                        }}
                    >
                        {submitting ? 'Saving…' : mode === 'create' ? 'Create Template' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
