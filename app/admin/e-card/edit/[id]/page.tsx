'use client';
import { useEffect, useRef, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, Textbox, FabricImage } from 'fabric';
import { uploadDataUrlToCloudinary } from '@/lib/cloudinary';
import type { Category, Subcategory } from '@/lib/types';

const PRESET_FONTS = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
  'Courier New', 'Comic Sans MS', 'Impact', 'Trebuchet MS'
];

interface TemplateData {
  id: number;
  name: string;
  description: string;
  template_image_url: string;
  is_multipage?: boolean;
  pages?: Array<{
    imageUrl?: string;
    cloudinaryPublicId?: string;
    backgroundId?: number;
    canvasData: {
      textElements: TemplateData['canvas_data']['textElements'];
      canvasWidth?: number;
      canvasHeight?: number;
    };
  }>;
  thumbnail_uri?: string;
  canvas_data: {
    textElements: Array<{
      id: string;
      text: string;
      label: string;
      left: number;
      top: number;
      fontSize: number;
      fontFamily: string;
      fontWeight?: string;
      fill: string;
      width?: number;
      textAlign?: string;
      angle?: number;
      locked?: boolean;
    }>;
    canvasWidth?: number;
    canvasHeight?: number;
    customFonts?: Array<{ name: string; url: string }>;
  };
}

export default function AdminEditorById({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // UI States
  const [active, setActive] = useState<Textbox | null>(null);
  const [textValue, setTextValue] = useState('');
  const [fontSize, setFontSize] = useState(40);
  const [fillColor, setFillColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [isTextLocked, setIsTextLocked] = useState(false);

  // Font search states
  const [fontSearchQuery, setFontSearchQuery] = useState('');
  const [showFontSuggestions, setShowFontSuggestions] = useState(false);

  // Custom Font States
  const [customFontUrl, setCustomFontUrl] = useState('');
  const [customFontName, setCustomFontName] = useState('');
  const [isLoadingFont, setIsLoadingFont] = useState(false);
  const [loadedCustomFonts, setLoadedCustomFonts] = useState<Array<{ name: string; url: string }>>([]);

  // Template States
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateImageUrl, setTemplateImageUrl] = useState('/images/template.png');
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState<string | null>(null);
  const [oldPublicId, setOldPublicId] = useState<string | null>(null);
  const [oldThumbnailPublicId, setOldThumbnailPublicId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(1);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Pricing States
  const [pricingType, setPricingType] = useState<'free' | 'premium'>('free');
  const [price, setPrice] = useState('');

  // Multipage state
  const [isMultipage, setIsMultipage] = useState(false);
  const [pages, setPages] = useState<Array<{ imageUrl?: string; publicId?: string | null; canvasData: any }>>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Max 5MB allowed.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/uploads/cloudinary', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      const imageUrl = result.secureUrl as string;
      setTemplateImageUrl(imageUrl);
      setCloudinaryPublicId(result.publicId);

      if (isMultipage && pages.length > 0) {
        persistCurrentPage();
        const updated = [...pages];
        updated[currentPageIndex] = {
          ...updated[currentPageIndex],
          imageUrl,
          publicId: result.publicId,
        };
        setPages(updated);
      }

      if (fabricCanvas.current) {
        FabricImage.fromURL(imageUrl, {
          crossOrigin: 'anonymous'
        }).then((img) => {
          const canvas = fabricCanvas.current;
          if (!canvas) {
            console.warn('Canvas is no longer available');
            return;
          }
          const containerWidth = containerRef.current!.clientWidth;
          const containerHeight = containerRef.current!.clientHeight;

          const imgWidth = img.width;
          const imgHeight = img.height;

          const scaleX = (containerWidth - 64) / imgWidth;
          const scaleY = (containerHeight - 64) / imgHeight;
          const scaleFactor = Math.min(scaleX, scaleY, 1);

          const finalWidth = imgWidth * scaleFactor;
          const finalHeight = imgHeight * scaleFactor;

          canvas.setDimensions({
            width: finalWidth,
            height: finalHeight,
          });

          canvas.backgroundImage = img;
          img.set({
            scaleX: finalWidth / imgWidth,
            scaleY: finalHeight / imgHeight,
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0
          });

          canvas.requestRenderAll();
          setIsUploadingImage(false);
        }).catch((err) => {
          console.error('Failed to render uploaded image:', err);
          setIsUploadingImage(false);
        });
      } else {
        setIsUploadingImage(false);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      setIsUploadingImage(false);
    }
  };

  // Load existing template
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const response = await fetch(`/api/templates/${unwrappedParams.id}`);
        const result = await response.json();

        if (result.success) {
          const template = result.data as TemplateData & { category_id?: number; subcategory_id?: number | null; cloudinary_public_id?: string | null; thumbnail_public_id?: string | null };
          setTemplateData(template);
          setTemplateName(template.name);
          setTemplateDescription(template.description || '');

          // Multipage initialization
          if (template.is_multipage && template.pages && template.pages.length > 0) {
            const normalizedPages = template.pages.map((p) => ({
              imageUrl: p.imageUrl,
              publicId: p.cloudinaryPublicId ?? null,
              canvasData: {
                textElements: p.canvasData.textElements || [],
                canvasWidth: p.canvasData.canvasWidth,
                canvasHeight: p.canvasData.canvasHeight,
              },
            }));
            setIsMultipage(true);
            setPages(normalizedPages);
            setTemplateImageUrl(normalizedPages[0]?.imageUrl || template.template_image_url);
          } else {
            setIsMultipage(false);
            setPages([]);
            setTemplateImageUrl(template.template_image_url);
          }

          setCloudinaryPublicId(template.cloudinary_public_id || null);
          setOldPublicId(template.cloudinary_public_id || null);
          setOldThumbnailPublicId(template.thumbnail_public_id || null);
          setCategoryId(template.category_id || 1);
          setSubcategoryId(template.subcategory_id || null);

          // Load pricing data
          setPricingType((template as any).pricing_type || 'free');
          setPrice(((template as any).price || 0).toString());
        }
      } catch (error) {
        console.error('Error loading template:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplate();
  }, [unwrappedParams.id]);

  // Load categories initially
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        if (json.success) setCategories(json.data);
      } catch (e) {
        console.error('Failed to load categories', e);
      }
    };
    loadCategories();
  }, []);

  // Load managed fonts from database
  useEffect(() => {
    let cancelled = false;

    const loadManagedFonts = async () => {
      try {
        const res = await fetch('/api/font-cdn-links');
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) return;
        const fonts: Array<{ name: string; url: string }> = json.data.map((f: any) => ({ name: f.font_name, url: f.cdn_link }));

        for (const font of fonts) {
          const id = `font-${font.name.replace(/\s+/g, '-').toLowerCase()}`;
          if (!document.getElementById(id)) {
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = font.url;
            document.head.appendChild(link);
          }
          try {
            await document.fonts.load(`16px "${font.name}"`);
          } catch (err) {
            console.error(`Failed to load managed font ${font.name}:`, err);
          }
        }

        if (!cancelled) {
          setLoadedCustomFonts((prev) => {
            const merged = [...prev];
            fonts.forEach((f) => {
              if (!merged.find((item) => item.name === f.name)) {
                merged.push(f);
              }
            });
            return merged;
          });
        }
      } catch (err) {
        console.error('Failed to load managed fonts', err);
      }
    };

    loadManagedFonts();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load subcategories when category changes
  useEffect(() => {
    const loadSubcategories = async () => {
      try {
        setSubcategoryId(null);
        const res = await fetch(`/api/subcategories?category_id=${categoryId}`);
        const json = await res.json();
        if (json.success) setSubcategories(json.data);
      } catch (e) {
        console.error('Failed to load subcategories', e);
      }
    };
    if (categoryId) loadSubcategories();
  }, [categoryId]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !templateData) return;

    const activePage = isMultipage && pages.length > 0 ? pages[currentPageIndex] : null;
    const activeImageUrl = activePage?.imageUrl || templateImageUrl;
    const activeTextElements = activePage?.canvasData?.textElements || templateData.canvas_data?.textElements || [];
    const activeCanvasWidth = activePage?.canvasData?.canvasWidth || templateData.canvas_data?.canvasWidth;
    const activeCanvasHeight = activePage?.canvasData?.canvasHeight || templateData.canvas_data?.canvasHeight;

    // Dispose existing canvas if any
    if (fabricCanvas.current) {
      fabricCanvas.current.dispose();
      fabricCanvas.current = null;
    }

    // Load custom fonts if any
    const loadCustomFonts = async () => {
      if (templateData.canvas_data?.customFonts) {
        setLoadedCustomFonts((prev) => {
          const merged = [...prev];
          templateData.canvas_data!.customFonts!.forEach((f) => {
            if (!merged.find((item) => item.name === f.name)) {
              merged.push(f);
            }
          });
          return merged;
        });
        for (const font of templateData.canvas_data.customFonts) {
          const id = `font-${font.name.replace(/\s+/g, '-').toLowerCase()}`;
          if (!document.getElementById(id)) {
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = font.url;
            document.head.appendChild(link);

            try {
              await document.fonts.load(`16px "${font.name}"`);
            } catch (err) {
              console.error(`Failed to load font ${font.name}:`, err);
            }
          }
        }
        await document.fonts.ready;
      }
    };

    loadCustomFonts().then(() => {
      const canvas = new Canvas(canvasRef.current!, {
        backgroundColor: '#ffffff'
      });
      fabricCanvas.current = canvas;

      const containerWidth = containerRef.current!.clientWidth;
      const containerHeight = containerRef.current!.clientHeight;

      FabricImage.fromURL(activeImageUrl, {
        crossOrigin: 'anonymous'
      }).then((img) => {
        const canvas = fabricCanvas.current;
        if (!canvas) return;

        const imgWidth = img.width;
        const imgHeight = img.height;

        const scaleX = (containerWidth - 64) / imgWidth;
        const scaleY = (containerHeight - 64) / imgHeight;
        const scaleFactor = Math.min(scaleX, scaleY, 1);

        const finalWidth = imgWidth * scaleFactor;
        const finalHeight = imgHeight * scaleFactor;

        canvas.setDimensions({
          width: activeCanvasWidth || finalWidth,
          height: activeCanvasHeight || finalHeight,
        });

        canvas.backgroundImage = img;
        img.set({
          scaleX: finalWidth / imgWidth,
          scaleY: finalHeight / imgHeight,
          originX: 'left',
          originY: 'top',
          left: 0,
          top: 0
        });

        // Load existing text elements
        if (activeTextElements) {
          activeTextElements.forEach((textData:any) => {
            const textbox = new Textbox(textData.text, {
              left: textData.left,
              top: textData.top,
              fontSize: textData.fontSize,
              fontFamily: textData.fontFamily,
              fontWeight: textData.fontWeight || 'normal',
              fill: textData.fill,
              width: textData.width,
              textAlign: textData.textAlign as any,
              angle: textData.angle || 0,
              originX: 'center',
              originY: 'center',
              cornerStyle: 'circle',
              cornerColor: '#3b82f6'
            });
            // Restore lock state for admin visibility
            (textbox as any).isLocked = Boolean((textData as any).locked);
            canvas.add(textbox);
          });
        }

        canvas.requestRenderAll();
      });

      const syncSidebar = () => {
        const selected = canvas.getActiveObject();
        if (selected instanceof Textbox) {
          setActive(selected);
          setTextValue(selected.text || '');
          setFontSize(selected.fontSize || 40);
          setFillColor((selected.fill as string) || '#000000');
          setFontFamily(selected.fontFamily || 'Arial');
          setIsTextLocked((selected as any).isLocked || false);
        } else {
          setActive(null);
        }
      };

      canvas.on('selection:created', syncSidebar);
      canvas.on('selection:updated', syncSidebar);
      canvas.on('selection:cleared', () => setActive(null));

      canvas.on('text:changed', (e: any) => {
        if (e.target instanceof Textbox) setTextValue(e.target.text || '');
      });
    });

    return () => {
      if (fabricCanvas.current) {
        fabricCanvas.current.dispose();
        fabricCanvas.current = null;
      }
    };
  }, [templateData, isMultipage, pages, currentPageIndex, templateImageUrl]);

  const handleApplyCustomFont = async () => {
    if (!active || !customFontUrl || !customFontName || !fabricCanvas.current) return;

    setIsLoadingFont(true);
    const id = `font-${customFontName.replace(/\s+/g, '-').toLowerCase()}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = customFontUrl;
      document.head.appendChild(link);
    }

    try {
      await document.fonts.load(`16px "${customFontName}"`);
      await document.fonts.ready;

      active.set({
        fontFamily: customFontName,
        dirty: true
      });

      active.initDimensions();
      fabricCanvas.current.requestRenderAll();
      setFontFamily(customFontName);

      // Track this custom font
      setLoadedCustomFonts(prev => {
        const existing = prev.find(f => f.name === customFontName);
        if (!existing) {
          return [...prev, { name: customFontName, url: customFontUrl }];
        }
        return prev;
      });
    } catch (err) {
      console.error("Font loading failed:", err);
      alert("Error loading font. Please check the URL.");
    } finally {
      setIsLoadingFont(false);
    }
  };

  const handleAttributeChange = (key: string, value: any) => {
    if (!active || !fabricCanvas.current) return;
    active.set(key as any, value);
    if (key === 'text') setTextValue(value);
    if (key === 'fontSize') setFontSize(value);
    if (key === 'fill') setFillColor(value);
    if (key === 'fontFamily') setFontFamily(value);
    active.initDimensions();
    fabricCanvas.current.requestRenderAll();
  };

  const addText = () => {
    if (!fabricCanvas.current) return;
    const canvas = fabricCanvas.current;
    const tb = new Textbox('Double click to edit', {
      left: canvas.width / 2,
      top: canvas.height / 2,
      width: 250,
      fontSize: 40,
      fontFamily: 'Arial',
      fill: '#000000',
      originX: 'center',
      originY: 'center',
      textAlign: 'center',
      cornerStyle: 'circle',
      cornerColor: '#3b82f6'
    });
    canvas.add(tb);
    canvas.setActiveObject(tb);
    canvas.requestRenderAll();
  };

  const persistCurrentPage = () => {
    if (!isMultipage || !fabricCanvas.current || pages.length === 0) return;
    const objects = fabricCanvas.current.getObjects();
    const textElements = objects.filter(obj => obj instanceof Textbox).map((obj, i) => {
      const textbox = obj as Textbox;
      return {
        id: String(i + 1),
        text: textbox.text || '',
        label: `Text Field ${i + 1}`,
        left: textbox.left,
        top: textbox.top,
        fontSize: textbox.fontSize,
        fontFamily: textbox.fontFamily,
        fontWeight: textbox.fontWeight,
        fill: textbox.fill,
        width: textbox.width,
        textAlign: textbox.textAlign,
        angle: textbox.angle || 0,
        locked: (textbox as any).isLocked || false,
      };
    });
    const updated = [...pages];
    updated[currentPageIndex] = {
      ...updated[currentPageIndex],
      canvasData: {
        textElements,
        canvasWidth: fabricCanvas.current.width,
        canvasHeight: fabricCanvas.current.height,
      },
    };
    setPages(updated);
  };

  const switchPage = async (index: number) => {
    if (!isMultipage || index === currentPageIndex || index < 0 || index >= pages.length) return;
    if (!fabricCanvas.current || !containerRef.current) return;

    persistCurrentPage();

    // Clear canvas before loading
    fabricCanvas.current.clear();
    fabricCanvas.current.discardActiveObject();
    setActive(null);

    setCurrentPageIndex(index);
    setTemplateImageUrl(pages[index].imageUrl || templateImageUrl);
  };

  const addPage = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/uploads/background', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        if (!result.success) throw new Error('Failed to upload image');

        persistCurrentPage();

        const newPage = {
          imageUrl: result.data.cloudinary_url as string,
          publicId: result.data.cloudinary_public_id as string,
          canvasData: {
            textElements: [],
            canvasWidth: fabricCanvas.current?.width || 800,
            canvasHeight: fabricCanvas.current?.height || 600,
          },
        };

        const updatedPages = [...pages, newPage];
        setPages(updatedPages);
        setIsMultipage(true);
        setTimeout(() => switchPage(updatedPages.length - 1), 50);
      } catch (error) {
        console.error('Error adding page:', error);
        alert('Error adding page');
      } finally {
        setIsUploadingImage(false);
      }
    };
    fileInput.click();
  };

  const deletePage = (index: number) => {
    if (!isMultipage || pages.length <= 1) {
      alert('Cannot delete the last page');
      return;
    }
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
    const nextIndex = Math.max(0, Math.min(currentPageIndex, newPages.length - 1));
    setTimeout(() => switchPage(nextIndex), 50);
  };

  const updateTemplate = async () => {
    if (!fabricCanvas.current || !templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    setIsSaving(true);
    try {
      const objects = fabricCanvas.current.getObjects();
      const textElements = objects.filter(obj => obj instanceof Textbox).map((obj, index) => {
        const textbox = obj as Textbox;
        return {
          id: String(index + 1),
          text: textbox.text || '',
          label: `Text Field ${index + 1}`,
          left: textbox.left,
          top: textbox.top,
          fontSize: textbox.fontSize,
          fontFamily: textbox.fontFamily,
          fill: textbox.fill,
          width: textbox.width,
          textAlign: textbox.textAlign,
          angle: textbox.angle || 0,
          locked: (textbox as any).isLocked || false,
        };
      });

      const thumbnailDataURL = fabricCanvas.current.toDataURL({ format: 'png', multiplier: 0.3 });
      const thumbUpload = await uploadDataUrlToCloudinary(thumbnailDataURL, 'template-thumbnail.png');

      // For multipage, we need to get the current canvas data and merge with existing pages
      const pagesPayload = isMultipage ? pages.map((p, idx) => {
        // If this is the current page, use the current canvas data
        if (idx === currentPageIndex) {
          return {
            imageUrl: p.imageUrl,
            cloudinaryPublicId: p.publicId,
            canvasData: {
              textElements,
              canvasWidth: fabricCanvas.current?.width || 800,
              canvasHeight: fabricCanvas.current?.height || 600,
            },
          };
        }
        // Otherwise, use the stored data
        return {
          imageUrl: p.imageUrl,
          cloudinaryPublicId: p.publicId,
          canvasData: p.canvasData || {
            textElements: [],
            canvasWidth: fabricCanvas.current?.width || 800,
            canvasHeight: fabricCanvas.current?.height || 600,
          },
        };
      }) : undefined;

      const response = await fetch(`/api/templates/${unwrappedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          template_image_url: isMultipage && pages.length > 0 ? pages[0].imageUrl || templateImageUrl : templateImageUrl,
          cloudinary_public_id: cloudinaryPublicId,
          old_public_id: oldPublicId,
          thumbnail_uri: thumbUpload.secureUrl,
          thumbnail_public_id: thumbUpload.publicId,
          old_thumbnail_public_id: oldThumbnailPublicId,
          category_id: categoryId,
          subcategory_id: subcategoryId,
          is_multipage: isMultipage,
          pricing_type: pricingType,
          price: pricingType === 'premium' ? parseFloat(price) || 0 : 0,
          canvas_data: {
            textElements,
            canvasWidth: fabricCanvas.current.width,
            canvasHeight: fabricCanvas.current.height,
            customFonts: loadedCustomFonts,
            pages: pagesPayload,
          },
          pages: pagesPayload,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('Template updated successfully!');
        router.push('/templates');
      } else {
        alert('Failed to update template: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Error updating template');
    } finally {
      setIsSaving(false);
    }
  };

  function cloudinaryPublicIdFromUrl(url: string | null | undefined): string | null {
    try {
      if (!url) return null;
      const afterUpload = url.split('/upload/')[1];
      if (!afterUpload) return null;
      let parts = afterUpload.split('/');
      if (parts[0]?.startsWith('v') && /^v\d+$/.test(parts[0])) {
        parts = parts.slice(1);
      }
      const last = parts.pop();
      if (!last) return null;
      const lastNoExt = last.replace(/\.[^.]+$/, '');
      return parts.length ? parts.join('/') + '/' + lastNoExt : lastNoExt;
    } catch {
      return null;
    }
  }
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
      <div ref={containerRef} className="flex-1 p-8 flex justify-center items-center bg-slate-200 overflow-auto">
        <div className="shadow-2xl rounded-lg overflow-hidden border border-gray-200 bg-white">
          <canvas ref={canvasRef} />
        </div>
      </div>

      <div className="w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col p-6 gap-6 overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Edit Template</h1>
          </div>
          <button
            onClick={() => router.push('/admin/e-card')}
            className="text-xl text-gray-600 hover:text-gray-900"
          >
            ✕
          </button>
        </div>

        <div className="bg-purple-50 p-4 rounded-xl space-y-3 border border-purple-100">
          <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Template Information</label>
          <input
            type="text"
            placeholder="Template Name *"
            className="w-full p-2 text-sm border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
          <textarea
            placeholder="Description (optional)"
            className="w-full p-2 text-sm border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            rows={2}
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Category</label>
              <select
                className="w-full p-2 text-sm border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                value={categoryId}
                onChange={(e) => setCategoryId(parseInt(e.target.value, 10) || 1)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Subcategory</label>
              <select
                className="w-full p-2 text-sm border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                value={subcategoryId ?? ''}
                onChange={(e) => setSubcategoryId(e.target.value ? parseInt(e.target.value, 10) : null)}
              >
                <option value="">None</option>
                {subcategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="border-t pt-3 space-y-3">
            <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Pricing</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pricing"
                  value="free"
                  checked={pricingType === 'free'}
                  onChange={(e) => setPricingType(e.target.value as 'free' | 'premium')}
                  className="w-4 h-4"
                />
                <span className="text-sm">Free</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pricing"
                  value="premium"
                  checked={pricingType === 'premium'}
                  onChange={(e) => setPricingType(e.target.value as 'free' | 'premium')}
                  className="w-4 h-4"
                />
                <span className="text-sm">Premium</span>
              </label>
            </div>

            {pricingType === 'premium' && (
              <div>
                <label className="text-xs font-semibold text-purple-700 block mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter price"
                  className="w-full p-2 text-sm border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Multipage Toggle */}
          <div className="space-y-2 border-t pt-3">
            <label className="text-xs font-semibold text-purple-700 flex items-center gap-2">
              <input
                type="checkbox"
                checked={isMultipage}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setIsMultipage(enabled);
                  if (!enabled) {
                    setPages([]);
                    setCurrentPageIndex(0);
                    setTemplateImageUrl(templateData?.template_image_url || templateImageUrl);
                  }
                }}
                className="w-4 h-4 rounded"
              />
              Enable Multipage Template
            </label>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-purple-700">
              {isMultipage ? `Page ${currentPageIndex + 1} Background` : 'Template Background Image'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="w-full h-10 bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white rounded-lg text-sm font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isUploadingImage ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                '📷 Upload New Background'
              )}
            </label>
            {templateImageUrl && templateImageUrl !== '/images/template.png' && (
              <p className="text-xs text-purple-600 truncate">Image updated ✓</p>
            )}
          </div>

          {/* Pages list */}
          {isMultipage && (
            <div className="space-y-2 border-t pt-3">
              <label className="text-xs font-semibold text-purple-700">Pages ({pages.length || 0})</label>
              {pages.length === 0 ? (
                <p className="text-xs text-gray-500">Add a page to start.</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded-lg">
                  {pages.map((page, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded ${currentPageIndex === idx
                          ? 'bg-purple-200 border border-purple-400'
                          : 'bg-white border border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                      <button
                        onClick={() => switchPage(idx)}
                        aria-label={`Switch to page ${idx + 1}`}
                        className="text-sm font-semibold flex-1 text-left focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 transition"
                      >
                        Page {idx + 1}
                      </button>
                      <button
                        onClick={() => deletePage(idx)}
                        aria-label={`Delete page ${idx + 1}`}
                        className="text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-2 py-0.5 text-xs font-bold transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={addPage}
                disabled={isUploadingImage}
                className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-bold transition shadow-md flex items-center justify-center gap-2"
              >
                {isUploadingImage ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Adding Page...
                  </>
                ) : (
                  '+ Add Page'
                )}
              </button>
            </div>
          )}

          <button
            onClick={updateTemplate}
            disabled={isSaving || !templateName.trim()}
            className="w-full h-12 bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white rounded-lg text-sm font-bold transition shadow-md flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Updating...
              </>
            ) : (
              '💾 Update Template'
            )}
          </button>
        </div>

        <button
          onClick={addText}
          className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-all transform active:scale-95"
        >
          + Add Text Layer
        </button>

        {active ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Text Content</label>
                <textarea
                  className="w-full p-3 border rounded-lg mt-1 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  rows={3}
                  value={textValue}
                  onChange={(e) => handleAttributeChange('text', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Size</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg bg-gray-50 outline-none"
                    value={fontSize}
                    onChange={(e) => handleAttributeChange('fontSize', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Color</label>
                  <input
                    type="color"
                    className="w-full h-10 p-1 border rounded-lg cursor-pointer bg-gray-50"
                    value={fillColor}
                    onChange={(e) => handleAttributeChange('fill', e.target.value)}
                  />
                </div>
              </div>

              <div className="relative">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Font Style</label>
                <input
                  type="text"
                  value={fontSearchQuery || fontFamily}
                  onChange={(e) => {
                    setFontSearchQuery(e.target.value);
                    setShowFontSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && fontSearchQuery.trim()) {
                      e.preventDefault();
                      handleAttributeChange('fontFamily', fontSearchQuery.trim());
                      setFontSearchQuery('');
                      setShowFontSuggestions(false);
                    }
                  }}
                  onFocus={() => setShowFontSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowFontSuggestions(false), 200)}
                  placeholder="Search or type font name..."
                  className="w-full p-2 border rounded-lg mt-1 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {showFontSuggestions && (() => {
                  const availableFonts = Array.from(new Set([...PRESET_FONTS, ...loadedCustomFonts.map((f) => f.name)]));
                  const filteredFonts = fontSearchQuery.trim()
                    ? availableFonts.filter(font => font.toLowerCase().includes(fontSearchQuery.toLowerCase()))
                    : availableFonts;
                  
                  return filteredFonts.length > 0 ? (
                    <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg">
                      {filteredFonts.map((font) => (
                        <button
                          key={font}
                          type="button"
                          onClick={() => {
                            handleAttributeChange('fontFamily', font);
                            setFontSearchQuery('');
                            setShowFontSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition"
                          style={{ fontFamily: font }}
                        >
                          {font}
                        </button>
                      ))}
                    </div>
                  ) : fontSearchQuery.trim() ? (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg px-3 py-2 text-sm text-gray-500">
                      No matches. Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> to use "{fontSearchQuery}".
                    </div>
                  ) : null;
                })()}
                <p className="text-xs text-gray-500 mt-1">Current: <span style={{ fontFamily: fontFamily }}>{fontFamily}</span></p>
              </div>

              {/* Position on Canvas */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Position on Canvas</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <button
                    onClick={() => {
                      if (active && fabricCanvas.current) {
                        const padding = 50;
                        active.set({
                          left: fabricCanvas.current.width - padding,
                          originX: 'right',
                        });
                        active.setCoords();
                        fabricCanvas.current.requestRenderAll();
                      }
                    }}
                    className="h-10 rounded-lg text-sm font-bold transition flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700"
                    title="Align Left"
                  >
                    ⬅
                  </button>
                  <button
                    onClick={() => {
                      if (active && fabricCanvas.current) {
                        active.set({
                          left: fabricCanvas.current.width / 2,
                          originX: 'center',
                        });
                        active.setCoords();
                        fabricCanvas.current.requestRenderAll();
                      }
                    }}
                    className="h-10 rounded-lg text-sm font-bold transition flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700"
                    title="Align Center"
                  >
                    ↔
                  </button>
                  <button
                    onClick={() => {
                      if (active && fabricCanvas.current) {
                        const padding = 50;
                        active.set({
                          left: padding,
                          originX: 'left',
                        });
                        active.setCoords();
                        fabricCanvas.current.requestRenderAll();
                      }
                    }}
                    className="h-10 rounded-lg text-sm font-bold transition flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700"
                    title="Align Right"
                  >
                    ➡
                  </button>
                </div>
              </div>
            </div>

            {/* Lock Field Section */}
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <button
                onClick={() => {
                  if (active) {
                    const isLocked = !(active as any).isLocked;
                    (active as any).isLocked = isLocked;
                    setIsTextLocked(isLocked);
                    fabricCanvas.current?.requestRenderAll();
                  }
                }}
                className={`w-full h-10 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${isTextLocked
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
              >
                {isTextLocked ? '🔒 Field Locked' : '🔓 Field Unlocked'}
              </button>
              <p className="text-xs text-gray-600 mt-2 text-center">
                {isTextLocked ? 'Users cannot edit this field' : 'Users can edit this field'}
              </p>
            </div>
            <button
              onClick={() => {
                fabricCanvas.current?.remove(active);
                fabricCanvas.current?.discardActiveObject();
                fabricCanvas.current?.requestRenderAll();
                setActive(null);
              }}
              className="w-full py-3 text-red-500 border border-red-100 rounded-xl text-sm hover:bg-red-50 font-bold"
            >
              Delete Layer
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl p-6">
            <p className="text-sm">Select a layer to start editing</p>
          </div>
        )}
      </div>
    </div>
  );
}