'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Template, UserEcard } from '@/lib/types';
import { slugify } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import { DetailView } from '@/app/e-card/_components/DetailView';
import { ListView } from '@/app/e-card/_components/ListView';
import ShareCard from '@/app/e-card/_components/ShareCard';

const stripNumericSuffix = (value: string) => value.replace(/-\d+$/, '');
const hasNumericSuffix = (value: string) => /-\d+$/.test(value);

function parseSlug(slugParam?: string | string[]) {
    const parts = Array.isArray(slugParam)
        ? slugParam
        : typeof slugParam === 'string'
            ? [slugParam]
            : [];
    
    if (parts.length >= 2) {
        const lastIsNumeric = /^\d+$/.test(parts[parts.length - 1]);
        
        if (lastIsNumeric && parts.length === 2) {
            return { categorySlug: undefined, subcategorySlug: undefined };
        } else if (lastIsNumeric && parts.length >= 3) {
            return { categorySlug: parts[0], subcategorySlug: parts[1] };
        } else {
            return { categorySlug: parts[0], subcategorySlug: parts[1] };
        }
    }

    return { categorySlug: parts[0], subcategorySlug: undefined };
}

export default function ECardHomePage() {
    const params = useParams<{ slug?: string[] }>();
    const router = useRouter();

    const initialSlugs = parseSlug(params.slug);
    const slugParts = Array.isArray(params.slug)
        ? params.slug
        : typeof params.slug === 'string'
            ? [params.slug]
            : [];
    const initialIsDetail = (slugParts.length === 1 && !/^\d+$/.test(slugParts[0])) ||
                           (slugParts.length === 3 && !/^\d+$/.test(slugParts[2]));

    const [templates, setTemplates] = useState<Template[]>([]);
    const [videoTemplates, setVideoTemplates] = useState<any[]>([]);
    const [colorFilter, setColorFilter] = useState('all');
    const [categories, setCategories] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | undefined>(initialSlugs.categorySlug);
    const [activeSubcategory, setActiveSubcategory] = useState<string | undefined>(initialSlugs.subcategorySlug);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'detail' | 'published'>(initialIsDetail ? 'detail' : 'list');
    const [templateDetail, setTemplateDetail] = useState<Template | null>(null);
    const [publishedCard, setPublishedCard] = useState<UserEcard | null>(null);

    useEffect(() => {
        const parts = Array.isArray(params.slug)
            ? params.slug
            : typeof params.slug === 'string'
                ? [params.slug]
                : [];

        // Determine view mode and load data
        determineViewMode(parts);
    }, [params.slug]);

    const determineViewMode = async (parts: string[]) => {
        try {
            setLoading(true);
            setError('');

            // Fetch categories and subcategories first
            const [catsRes, subsRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/subcategories'),
            ]);

            const catsJson = await catsRes.json();
            const subsJson = await subsRes.json();

            const categories = catsJson.success ? catsJson.data : [];
            const subcategories = subsJson.success ? subsJson.data : [];

            if (parts.length === 1) {
                const categoryMatch = categories.find((c: any) => 
                    (c.slug || slugify(c.name || '')) === parts[0]
                );

                if (categoryMatch) {
                    // Category list
                    setViewMode('list');
                    setTemplateDetail(null);
                    setActiveCategory(parts[0]);
                    setActiveSubcategory(undefined);
                    loadTemplates(categoryMatch.id, undefined, categories, subcategories);
                } else if (parts[0].startsWith('card-')) {
                    // Published card via public_slug
                    setViewMode('published');
                    setActiveCategory(undefined);
                    setActiveSubcategory(undefined);
                    fetchPublishedCard(parts[0]);
                } else {
                    // Template detail
                    setViewMode('detail');
                    setActiveCategory(undefined);
                    setActiveSubcategory(undefined);
                    await fetchTemplateDetail(parts[0]);
                }
            } else if (parts.length === 2) {
                const categoryMatch = categories.find((c: any) => 
                    (c.slug || slugify(c.name || '')) === parts[0]
                );
                const subcategoryMatch = subcategories.find((s: any) => 
                    (s.slug || slugify(s.name || '')) === parts[1]
                );

                if (categoryMatch && subcategoryMatch && subcategoryMatch.category_id === categoryMatch.id) {
                    setViewMode('list');
                    setTemplateDetail(null);
                    setActiveCategory(parts[0]);
                    setActiveSubcategory(parts[1]);
                    loadTemplates(categoryMatch.id, subcategoryMatch.id, categories, subcategories);
                } else if (parts[1].startsWith('card-')) {
                    // It's a published card (public_slug format)
                    setViewMode('published');
                    setActiveCategory(undefined);
                    setActiveSubcategory(undefined);
                    fetchPublishedCard(parts[1]);
                } else if (categoryMatch) {
                    // Treat second part as template slug within the category
                    setViewMode('detail');
                    setActiveCategory(undefined);
                    setActiveSubcategory(undefined);
                    await fetchTemplateDetail(parts[1], categoryMatch, undefined);
                } else {
                    setError('Category or subcategory not found');
                    setTemplates([]);
                    setLoading(false);
                }
            } else if (parts.length === 3) {
                const categoryMatch = categories.find((c: any) => 
                    (c.slug || slugify(c.name || '')) === parts[0]
                );
                const subcategoryMatch = subcategories.find((s: any) => 
                    (s.slug || slugify(s.name || '')) === parts[1]
                );

                // Check if it's a published card or template detail
                    // Published cards have public_slug format: card-{timestamp}-{random}
                    const isPublishedCard = parts[2].startsWith('card-');
                
                    if (isPublishedCard) {
                    // Published card - validate category/subcategory
                    if (categoryMatch && subcategoryMatch && subcategoryMatch.category_id === categoryMatch.id) {
                        setViewMode('published');
                        setActiveCategory(undefined);
                        setActiveSubcategory(undefined);
                        fetchPublishedCard(parts[2]);
                    } else {
                        setError('Category or subcategory not found');
                        setLoading(false);
                    }
                } else {
                    // Template detail - try to fetch template first, then validate path
                    setViewMode('detail');
                    setActiveCategory(undefined);
                    setActiveSubcategory(undefined);
                    
                    // Fetch template and validate category/subcategory match
                    fetchTemplateDetail(parts[2], categoryMatch, subcategoryMatch);
                }
            } else {
                setViewMode('list');
                setTemplateDetail(null);
                setActiveCategory(undefined);
                setActiveSubcategory(undefined);
                loadTemplates(undefined, undefined, categories, subcategories);
            }
        } catch {
            setError('Failed to load data');
            setLoading(false);
        }
    };

    const loadTemplates = async (categoryId?: number, subcategoryId?: number, cats?: any[], subs?: any[]) => {
        try {
            const qs = new URLSearchParams();
            if (categoryId) qs.append('category_id', String(categoryId));
            if (subcategoryId) qs.append('subcategory_id', String(subcategoryId));

            const templatesUrl = qs.toString() ? `/api/templates?${qs.toString()}` : '/api/templates';
            const cardsRes = await fetch(templatesUrl);
            const cards = await cardsRes.json();

            if (cards.success) {
                setTemplates(cards.data || []);
            }

            // Set categories if provided
            if (cats) {
                const subsByCategory: Record<number, any[]> = {};
                if (subs) {
                    subs.forEach((sub: any) => {
                        if (!subsByCategory[sub.category_id]) subsByCategory[sub.category_id] = [];
                        subsByCategory[sub.category_id].push(sub);
                    });
                }

                const shaped = (cats || []).map((cat: any) => {
                    const slug = cat.slug || slugify(cat.name || '');
                    return {
                        ...cat,
                        slug,
                        subcategories: (subsByCategory[cat.id] || []).map((sub) => ({
                            ...sub,
                            slug: sub.slug || slugify(sub.name || ''),
                        })),
                    };
                });
                setCategories(shaped);
            }
        } catch {
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplateDetail = async (slug: string, categoryMatch?: any, subcategoryMatch?: any) => {
        try {
            setLoading(true);
            setError('');
            const normalizedSlug = stripNumericSuffix(slug);
            // Fetch all templates and find by slug
            const res = await fetch('/api/templates');
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                const template = json.data.find((t: Template) => {
                    const tSlug = (t as any).slug || '';
                    return tSlug === slug || tSlug === normalizedSlug || stripNumericSuffix(tSlug) === normalizedSlug;
                });
                if (template) {
                    // If category/subcategory provided in URL, validate they match the template
                    if (categoryMatch && subcategoryMatch) {
                        const categoryMatches = template.category_slug === categoryMatch.slug;
                        const subcategoryMatches = template.subcategory_slug === subcategoryMatch.slug;
                        
                        if (!categoryMatches || !subcategoryMatches) {
                            // Template exists but path doesn't match - redirect to correct path
                            const correctCategorySlug = template.category_slug || (template.category_name ? slugify(template.category_name) : 'uncategorized');
                            const correctSubcategorySlug = template.subcategory_slug || (template.subcategory_name ? slugify(template.subcategory_name) : 'general');
                            const correctTemplateSlug = (template as any).slug || slugify(template.title || '');
                            router.push(`/e-card/${correctCategorySlug}/${correctSubcategorySlug}/${correctTemplateSlug}`);
                            return;
                        }
                    }
                    setTemplateDetail(template);
                } else {
                    // Redirect to list view instead of showing error
                    setViewMode('list');
                    setTemplateDetail(null);
                    router.push('/e-card');
                }
            } else {
                // Redirect to list view instead of showing error
                setViewMode('list');
                setTemplateDetail(null);
                router.push('/e-card');
            }
        } catch {
            // Redirect to list view instead of showing error
            setViewMode('list');
            setTemplateDetail(null);
            router.push('/e-card');
        } finally {
            setLoading(false);
        }
    };

    const fetchPublishedCard = async (slug: string) => {
        try {
            setLoading(true);
            setError('');
            setPublishedCard(null);
            const res = await fetch(`/api/user-ecards/${slug}`);
            const json = await res.json();
            if (json.success && json.data) {
                setPublishedCard(json.data as UserEcard);
            } else {
                // Redirect to list view instead of showing error
                setViewMode('list');
                setPublishedCard(null);
                router.push('/e-card');
            }
        } catch {
            // Redirect to list view instead of showing error
            setViewMode('list');
            setPublishedCard(null);
            router.push('/e-card');
        } finally {
            setLoading(false);
        }
    };

    const allSubcategories = categories.flatMap((c) => c.subcategories || []);
    const activeCategoryId = categories.find((c) => c.slug === activeCategory)?.id;
    const activeSubcategoryId = allSubcategories.find((s: any) => s.slug === activeSubcategory)?.id;

    const activeCategoryName = categories.find((c) => c.slug === activeCategory)?.name;
    const activeSubcategoryName = allSubcategories.find((s: any) => s.slug === activeSubcategory)?.name;

    const breadcrumbs = [
        { label: 'Home', href: '/' },
        { label: 'E-Card', href: '/e-card' },
        activeCategory && activeCategoryName ? { label: activeCategoryName, href: `/e-card/${activeCategory}` } : null,
        activeSubcategory && activeSubcategoryName && activeCategory
            ? { label: activeSubcategoryName, href: `/e-card/${activeCategory}/${activeSubcategory}` }
            : null,
    ].filter(Boolean) as { label: string; href?: string }[];

    const filteredTemplates = templates.filter((t) => {
        const matchesColor = colorFilter === 'all' || (t as any).color === colorFilter;
        const matchesCategory = !activeCategoryId || (t as any).category_id === Number(activeCategoryId);
        const matchesSubcategory = !activeSubcategoryId || (t as any).subcategory_id === Number(activeSubcategoryId);
        return matchesColor && matchesCategory && matchesSubcategory;
    });

    const handleCategorySelect = (category?: string, subcategory?: string) => {
        const categorySlug = category || undefined;
        const subcategorySlug = subcategory || undefined;

        setActiveCategory(categorySlug);
        setActiveSubcategory(subcategorySlug);

        if (categorySlug) {
            const path = subcategorySlug
                ? `/e-card/${categorySlug}/${subcategorySlug}`
                : `/e-card/${categorySlug}`;
            router.push(path);
        } else {
            router.push('/e-card');
        }
    };

    const currentDetailSlug = (slugParts.length === 1 && !/^\d+$/.test(slugParts[0])) 
        ? slugParts[0] 
        : (slugParts.length === 3 && !/^\d+$/.test(slugParts[2])) 
            ? slugParts[2]
            : undefined;

    if (viewMode === 'published') {
        return (
            <main className="min-h-screen bg-[#f7f4ef]">
                <PageHeader
                    title={publishedCard?.user_name || 'Shared Card'}
                    breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'E-Card', href: '/e-card' }, { label: publishedCard?.public_slug || 'Card' }]}
                />

                <div className="max-w-3xl mx-auto px-6 py-10">
                    {loading ? (
                        <div className="text-center text-gray-600">Loading card...</div>
                    ) : error ? (
                        <div className="text-center text-red-600">{error}</div>
                    ) : publishedCard ? (
                        <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-200">
                            <div className="p-6 space-y-4">
                                <h1 className="text-2xl font-semibold text-gray-900">{publishedCard.user_name || 'Shared Card'}</h1>
                                <p className="text-sm text-gray-600">Customized card preview</p>
                                <ShareCard card={publishedCard} />
                            </div>
                        </div>
                    ) : null}
                </div>
            </main>
        );
    }

    if (viewMode === 'detail') {
        return (
            <main className="min-h-screen bg-[#f7f4ef]">
                <PageHeader
                    title={templateDetail?.title || 'E-Card'}
                    breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'E-Card', href: '/e-card' }, { label: templateDetail?.title || 'Preview' }]}
                />

                <div className="max-w-xl mx-auto px-6 py-10">
                    <DetailView
                        template={templateDetail}
                        loading={loading}
                        error={error}
                        onRetry={() => currentDetailSlug && fetchTemplateDetail(currentDetailSlug)}
                    />
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f7f4ef]">
            <PageHeader
                title="E-Cards"
                breadcrumbs={breadcrumbs}
            />

            <div className="max-w-7xl mx-auto px-6 py-10">
                <ListView
                    templates={filteredTemplates}
                    videoTemplates={[]}
                    categories={categories}
                    activeCategory={activeCategory}
                    activeSubcategory={activeSubcategory}
                    colorFilter={colorFilter}
                    loading={loading}
                    error={error}
                    onCategorySelect={handleCategorySelect}
                    onColorChange={setColorFilter}
                    onRetry={() => {
                        const parts = Array.isArray(params.slug)
                            ? params.slug
                            : typeof params.slug === 'string'
                                ? [params.slug]
                                : [];
                        determineViewMode(parts);
                    }}
                />
            </div>
        </main>
    );
}
