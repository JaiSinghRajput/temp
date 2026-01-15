"use client";

import { Suspense } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { userEcardService } from '@/services';
import { renderCanvasToImage } from '@/lib/canvas-renderer';

interface DraftData {
	template_id: number;
	customized_data: any;
	preview_uri?: string;
	preview_urls?: string[];
	user_id?: string;
	user_name?: string;
}

function PreviewPageInner() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { user } = useAuth();

	const templateId = searchParams.get("template_id");
	const draftKeyParam = searchParams.get("draft");
	const [draft, setDraft] = useState<DraftData | null>(null);
	const [publishing, setPublishing] = useState(false);
	const [error, setError] = useState("");
	const [generatedPreviews, setGeneratedPreviews] = useState<string[]>([]);
	const [isGenerating, setIsGenerating] = useState(false);

	const canPublish = useMemo(() => !!draft && !!templateId, [draft, templateId]);

	useEffect(() => {
		if (!templateId || !draftKeyParam) return;
		try {
			const raw = sessionStorage.getItem(draftKeyParam);
			if (!raw) return;
			const parsed: DraftData = JSON.parse(raw);
			setDraft(parsed);
		} catch (err) {
			console.error("Failed to load draft from sessionStorage", err);
		}
	}, [templateId, draftKeyParam]);
	useEffect(() => {
		const generatePreviews = async () => {
			if (!draft?.customized_data || !draft.customized_data.pages) return;

			try {
				setIsGenerating(true);
				const pages = draft.customized_data.pages;
				const existingPreviews = draft.preview_urls || [];
				const generated: string[] = [];

				for (let i = 0; i < pages.length; i++) {
					// Use existing preview if available and not empty
					if (existingPreviews[i] && existingPreviews[i].trim()) {
						generated.push(existingPreviews[i]);
					} else {
						// Generate preview from canvas data
						try {
							const page = pages[i];
							const canvasData = page.canvasData;
							const backgroundUrl = page.imageUrl;
							const backgroundId = page.backgroundId;

							const preview = await renderCanvasToImage({
								canvasData,
								backgroundUrl,
								backgroundId,
								width: canvasData?.canvasWidth || 800,
								height: canvasData?.canvasHeight || 600,
							});

							generated.push(preview);
						} catch (pageErr) {
							console.warn(`Failed to generate preview for page ${i}:`, pageErr);
							generated.push(''); // Empty string as fallback
						}
					}
				}

				setGeneratedPreviews(generated);
			} catch (err) {
				console.error("Error generating previews:", err);
			} finally {
				setIsGenerating(false);
			}
		};

		generatePreviews();
	}, [draft]);

	const handlePublish = async () => {
		if (!canPublish || !templateId || !draft) return;
		try {
			setPublishing(true);
			setError("");

			const result = await userEcardService.createUserEcard({
				template_id: Number(templateId),
				customized_data: draft.customized_data,
				preview_uri: draft.preview_uri,
				preview_urls: generatedPreviews.length > 0 ? generatedPreviews : draft.preview_urls,
				user_id: draft.user_id || user?.uid || undefined,
				user_name: draft.user_name || user?.name || undefined,
			});

			if (result.success) {
				if (draftKeyParam) sessionStorage.removeItem(draftKeyParam);
				const catSlug = result.data?.category_slug;
				const subSlug = result.data?.subcategory_slug;
				const slug = result.data?.public_slug;
				if (slug) {
					if (catSlug && subSlug) {
						router.push(`/e-card/${catSlug}/${subSlug}/${slug}`);
					} else {
						router.push(`/e-card/${slug}`);
					}
				} else {
					router.push("/my-cards");
				}
			} else {
				setError(result.error || "Failed to publish card");
			}
		} catch (err) {
			console.error("Error publishing card:", err);
			setError("Failed to publish card");
		} finally {
			setPublishing(false);
		}
	};

	const handleEditAgain = () => {
		if (!templateId) return;
		router.push(`/e-card/customize/${templateId}`);
	};

	const previews = generatedPreviews.length > 0 ? generatedPreviews : (draft?.preview_urls?.length ? draft.preview_urls : draft?.preview_uri ? [draft.preview_uri] : []);

	return (
		<main className="min-h-screen bg-linear-to-br from-[#faf7f4] via-[#fdfaf7] to-[#f3e4d6]">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
				{error && (
					<div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-6 py-4">
						<p className="text-sm font-medium text-red-700">{error}</p>
					</div>
				)}

				{previews.length > 0 ? (
					<div className="max-w-xl mx-auto">
						{previews.map((src: string, idx: number) => (
							<div key={idx} className="rounded-2xl py-1">
								<div className="">
									{src && src.trim() ? (
										<img src={src} alt={`Preview ${idx + 1}`} className="w-full h-full object-contain" />
									) : (
										<div className="w-full h-full flex items-center justify-center text-gray-400">
											No preview
										</div>
									)}
								</div>
							</div>
						))}
							<div className="flex items-center justify-center gap-4 mt-8">
								<button
									onClick={handleEditAgain}
									className="inline-flex justify-center rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-800 w-full"
								>
									Edit again
								</button>
								<button
									onClick={handlePublish}
									disabled={!canPublish || publishing || isGenerating}
									className="inline-flex justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:bg-gray-300 w-full"
								>
									{publishing ? "Publishing…" : isGenerating ? "Generating previews…" : "Publish"}
								</button>
							</div>
					</div>
				) : (
					<div className="rounded-2xl border bg-white px-6 py-10 text-center text-gray-600">
						{isGenerating ? "Generating previews..." : "No preview available. Go back and edit to generate one."}
					</div>
				)}
			</div>
		</main>
	);
}

export default function PreviewPage() {
	return (
		<Suspense fallback={
			<main className="min-h-screen bg-linear-to-br from-[#faf7f4] via-[#fdfaf7] to-[#f3e4d6]">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
					<div className="rounded-2xl border bg-white px-6 py-10 text-center text-gray-600">Loading preview…</div>
				</div>
			</main>
		}>
			<PreviewPageInner />
		</Suspense>
	);
}
