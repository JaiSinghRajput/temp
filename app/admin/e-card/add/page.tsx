'use client';
import { useEffect, useRef, useState } from 'react';
import { Canvas, Textbox } from 'fabric';
import { useRouter } from 'next/navigation';
import { uploadToCloudinary, uploadDataUrlToCloudinary } from '@/lib/cloudinary';
import { loadCanvasBackgroundImage, validateImageFile } from '@/lib/canvas-utils';
import { loadCustomFont } from '@/lib/font-utils';
import { PRESET_FONTS, DEFAULT_TEMPLATE_IMAGE } from '@/lib/constants';
import type { CustomFont, Category, Subcategory } from '@/lib/types';

export default function AdminEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isCanvasDisposed = useRef(false);
  // UI States
  const [active, setActive] = useState<Textbox | null>(null);
  const [textValue, setTextValue] = useState('');
  const [fontSize, setFontSize] = useState(40);
  const [bold, setBold] = useState(false);
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
  const [loadedCustomFonts, setLoadedCustomFonts] = useState<CustomFont[]>([]);

  // Template Save States
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateImageUrl, setTemplateImageUrl] = useState(DEFAULT_TEMPLATE_IMAGE);
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categoryId, setCategoryId] = useState(1);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Pricing States
  const [pricingType, setPricingType] = useState<'free' | 'premium'>('free');
  const [price, setPrice] = useState('');

  // Multipage States
  const [pages, setPages] = useState<Array<{ imageUrl: string; publicId: string; canvasData?: any }>>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const isMultipage = pages.length > 1;

  const router = useRouter();

  // Load managed fonts from database
  useEffect(() => {
    let cancelled = false;

    const loadManagedFonts = async () => {
      try {
        const res = await fetch('/api/font-cdn-links');
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) return;
        const fonts: CustomFont[] = json.data.map((f: any) => ({ name: f.font_name, url: f.cdn_link }));

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/uploads/background', {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await response.json();
      if (!uploadResult.success) {
        throw new Error('Failed to upload image');
      }

      const result = {
        secureUrl: uploadResult.data.cloudinary_url,
        publicId: uploadResult.data.cloudinary_public_id,
      };

      setTemplateImageUrl(result.secureUrl);
      setCloudinaryPublicId(result.publicId);

      // If multipage mode and pages exist, update current page
      if (pages.length > 0) {
        // Save current text elements before updating background
        const objects = fabricCanvas.current?.getObjects() || [];
        const textElements = objects.filter(obj => obj instanceof Textbox).map((obj, i) => {
          const textbox = obj as Textbox;
          return {
            id: String(i + 1),
            text: textbox.text || '',
            label: `Text Field ${i + 1}`,
            left: textbox.left,
            top: textbox.top,
            fontSize: textbox.fontSize,
            fontWeight: textbox.fontWeight,
            fontFamily: textbox.fontFamily,
            fill: textbox.fill,
            width: textbox.width,
            textAlign: textbox.textAlign,
            angle: textbox.angle || 0,
            locked: (textbox as any).isLocked || false,
          };
        });

        const updatedPages = [...pages];
        updatedPages[currentPageIndex] = {
          imageUrl: result.secureUrl,
          publicId: result.publicId,
          canvasData: {
            textElements,
            canvasWidth: fabricCanvas.current?.width || 800,
            canvasHeight: fabricCanvas.current?.height || 600,
          },
        };
        setPages(updatedPages);

        // Clear and reload canvas to maintain text elements
        if (fabricCanvas.current) {
          fabricCanvas.current.clear();
        }
      }

      if (fabricCanvas.current && containerRef.current) {
        await loadCanvasBackgroundImage({
          canvas: fabricCanvas.current,
          imageUrl: result.secureUrl,
          containerWidth: containerRef.current.clientWidth,
          containerHeight: containerRef.current.clientHeight,
          isCancelled: () => isCanvasDisposed.current,
          onSuccess: () => {
            // Restore text elements after background update in multipage mode
            if (pages.length > 0 && pages[currentPageIndex]?.canvasData?.textElements) {
              pages[currentPageIndex].canvasData.textElements.forEach((element: any) => {
                const tb = new Textbox(element.text, {
                  left: element.left,
                  top: element.top,
                  fontSize: element.fontSize,
                  fontWeight: element.fontWeight,
                  fontFamily: element.fontFamily,
                  fill: element.fill,
                  width: element.width,
                  textAlign: element.textAlign,
                  angle: element.angle || 0,
                  originX: 'center',
                  originY: 'center',
                  cornerStyle: 'circle',
                  cornerColor: '#3b82f6'
                });
                (tb as any).isLocked = element.locked || false;
                fabricCanvas.current?.add(tb);
              });
              fabricCanvas.current?.requestRenderAll();
            }
            setIsUploadingImage(false);
          },
          onError: () => {
            alert('Failed to render uploaded image');
            setIsUploadingImage(false);
          },
        });
      } else {
        setIsUploadingImage(false);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to upload image');
      setIsUploadingImage(false);
    }
  };

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
    if (!canvasRef.current || !containerRef.current) return;

    isCanvasDisposed.current = false;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const canvas = new Canvas(canvasRef.current, {
      backgroundColor: '#ffffff',
      width: containerWidth - 64,
      height: containerHeight - 64
    });
    fabricCanvas.current = canvas;

    loadCanvasBackgroundImage({
      canvas,
      imageUrl: DEFAULT_TEMPLATE_IMAGE,
      containerWidth,
      containerHeight,
      isCancelled: () => isCanvasDisposed.current,
    });

    const syncSidebar = () => {
      const selected = canvas.getActiveObject();
      if (selected instanceof Textbox) {
        setActive(selected);
        setTextValue(selected.text || '');
        setFontSize(selected.fontSize || 40);
        setBold(selected.fontWeight === 'bold');
        setFillColor((selected.fill as string) || '#000000');
        setFontFamily(selected.fontFamily || 'Arial');
      } else {
        setActive(null);
      }
    };

    canvas.on('selection:created', syncSidebar);
    canvas.on('selection:updated', syncSidebar);
    canvas.on('selection:cleared', () => setActive(null));

    canvas.on('text:changed', (e) => {
      if (e.target instanceof Textbox) setTextValue(e.target.text || '');
    });

    return () => {
      isCanvasDisposed.current = true;
      canvas.dispose();
    };
  }, []);

  const handleApplyCustomFont = async () => {
    if (!active || !customFontUrl || !customFontName || !fabricCanvas.current) return;

    setIsLoadingFont(true);

    // Inject CSS Link if not exists
    const id = `font-${customFontName.replace(/\s+/g, '-').toLowerCase()}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = customFontUrl;
      document.head.appendChild(link);
    }

    try {
      // 1. Wait for the font to be loaded into the browser
      await document.fonts.load(`16px "${customFontName}"`);
      // 2. Critical: Wait for the layout engine to be ready
      await document.fonts.ready;

      // 3. Update Fabric Object
      active.set({
        fontFamily: customFontName,
        dirty: true // Forces a redraw of the text cache
      });

      active.initDimensions(); // Recalculates width/height based on new font
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
    if (key === 'fontWeight') setBold(value === 'bold');
    active.initDimensions();
    fabricCanvas.current.requestRenderAll();
  };

  const toggleBold = () => {
    if (!active || !fabricCanvas.current) return;
    const newBoldState = !bold;
    handleAttributeChange('fontWeight', newBoldState ? 'bold' : 'normal');
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
      fontWeight: 'normal',
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

  const downloadImage = () => {
    if (!fabricCanvas.current) return;
    const dataURL = fabricCanvas.current.toDataURL({ format: 'png', multiplier: 2 });
    const link = document.createElement('a');
    link.download = 'design.png';
    link.href = dataURL;
    link.click();
  };

  const saveTemplate = async () => {
    if (!fabricCanvas.current || !templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    setIsSaving(true);
    try {
      // Get all text objects from current canvas
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
          fontWeight: textbox.fontWeight,
          fontFamily: textbox.fontFamily,
          fill: textbox.fill,
          width: textbox.width,
          textAlign: textbox.textAlign,
          angle: textbox.angle || 0,
          locked: (textbox as any).isLocked || false,
        };
      });

      // If multipage, save current page data before saving template
      if (isMultipage && pages[currentPageIndex]) {
        pages[currentPageIndex].canvasData = {
          textElements,
          canvasWidth: fabricCanvas.current.width,
          canvasHeight: fabricCanvas.current.height,
        };
      }

      // Generate and upload final canvas thumbnail to Cloudinary
      const thumbnailDataURL = fabricCanvas.current.toDataURL({ format: 'png', multiplier: 0.3 });
      const thumbUpload = await uploadDataUrlToCloudinary(thumbnailDataURL, 'template-thumbnail.png');

      // Prepare canvas data - for multipage include all pages, otherwise just current page
      let canvasData: any = {
        textElements,
        canvasWidth: fabricCanvas.current.width,
        canvasHeight: fabricCanvas.current.height,
        customFonts: loadedCustomFonts,
      };

      if (isMultipage) {
        canvasData.pages = pages.map((page) => ({
          backgroundId: null,
          cloudinaryPublicId: page.publicId,
          imageUrl: page.imageUrl,
          canvasData: page.canvasData || {
            textElements: [],
            canvasWidth: fabricCanvas.current?.width || 800,
            canvasHeight: fabricCanvas.current?.height || 600,
          },
        }));
      }

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          template_image_url: templateImageUrl,
          cloudinary_public_id: cloudinaryPublicId,
          thumbnail_uri: thumbUpload.secureUrl,
          thumbnail_public_id: thumbUpload.publicId,
          category_id: categoryId,
          subcategory_id: subcategoryId,
          is_multipage: isMultipage,
          pricing_type: pricingType,
          price: pricingType === 'premium' ? parseFloat(price) || 0 : 0,
          canvas_data: canvasData,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('Template saved successfully!');
        router.push('/admin/e-card');
      } else {
        alert('Failed to save template: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    } finally {
      setIsSaving(false);
    }
  };

  // Snapshot the active canvas into a page payload (used when multipage starts or before switching pages)
  const buildCurrentPageSnapshot = () => {
    if (!fabricCanvas.current || !cloudinaryPublicId) return null;

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
        fontWeight: textbox.fontWeight,
        fontFamily: textbox.fontFamily,
        fill: textbox.fill,
        width: textbox.width,
        textAlign: textbox.textAlign,
        angle: textbox.angle || 0,
        locked: (textbox as any).isLocked || false,
      };
    });

    return {
      imageUrl: templateImageUrl,
      publicId: cloudinaryPublicId,
      canvasData: {
        textElements,
        canvasWidth: fabricCanvas.current.width,
        canvasHeight: fabricCanvas.current.height,
      },
    };
  };

  const addPage = async () => {
    if (!cloudinaryPublicId || templateImageUrl === DEFAULT_TEMPLATE_IMAGE) {
      alert('Please upload a background image for the current page before adding another page.');
      return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setIsUploadingImage(true);
        const currentPageSnapshot = buildCurrentPageSnapshot();
        if (!currentPageSnapshot) {
          setIsUploadingImage(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/uploads/background', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        if (result.success) {
          // Save the current page before appending a new one
          let updatedPages = [...pages];
          if (updatedPages.length === 0) {
            updatedPages = [currentPageSnapshot];
          } else if (updatedPages[currentPageIndex]) {
            updatedPages[currentPageIndex] = {
              ...updatedPages[currentPageIndex],
              canvasData: currentPageSnapshot.canvasData,
              imageUrl: updatedPages[currentPageIndex].imageUrl || currentPageSnapshot.imageUrl,
              publicId: updatedPages[currentPageIndex].publicId || currentPageSnapshot.publicId,
            };
          }

          const newPage = {
            imageUrl: result.data.cloudinary_url,
            publicId: result.data.cloudinary_public_id,
            canvasData: {
              textElements: [], // New page starts with empty text elements
              canvasWidth: fabricCanvas.current?.width || 800,
              canvasHeight: fabricCanvas.current?.height || 600,
            },
          };
          updatedPages = [...updatedPages, newPage];
          setPages(updatedPages);

          // Switch to the new page
          setTimeout(() => switchPage(updatedPages.length - 1), 100);
        } else {
          alert('Failed to upload image');
        }
      } catch (error) {
        console.error('Error uploading page image:', error);
        alert('Error uploading image');
      } finally {
        setIsUploadingImage(false);
      }
    };
    fileInput.click();
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) {
      alert('Cannot delete the last page');
      return;
    }

    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);

    // If deleting current page, switch to previous or first page
    if (index === currentPageIndex) {
      const newIndex = Math.max(0, index - 1);
      if (newPages.length > 0) {
        setTimeout(() => switchPage(newIndex), 100);
      }
    } else if (currentPageIndex >= newPages.length) {
      setCurrentPageIndex(Math.max(0, newPages.length - 1));
    }
  };

  const switchPage = async (index: number) => {
    if (!fabricCanvas.current || !containerRef.current || index < 0 || index >= pages.length) return;

    // Save current page canvas data before switching
    if (pages[currentPageIndex]) {
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
          fontWeight: textbox.fontWeight,
          fontFamily: textbox.fontFamily,
          fill: textbox.fill,
          width: textbox.width,
          textAlign: textbox.textAlign,
          angle: textbox.angle || 0,
          locked: (textbox as any).isLocked || false,
        };
      });
      pages[currentPageIndex].canvasData = {
        textElements,
        canvasWidth: fabricCanvas.current.width,
        canvasHeight: fabricCanvas.current.height,
      };
    }

    // Clear all objects from canvas (including text elements)
    fabricCanvas.current.clear();
    fabricCanvas.current.discardActiveObject();
    setActive(null);

    // Switch to new page
    setCurrentPageIndex(index);
    setTemplateImageUrl(pages[index].imageUrl);
    setCloudinaryPublicId(pages[index].publicId);

    // Load new page background and canvas data
    try {
      await loadCanvasBackgroundImage({
        canvas: fabricCanvas.current,
        imageUrl: pages[index].imageUrl,
        containerWidth: containerRef.current.clientWidth,
        containerHeight: containerRef.current.clientHeight,
        isCancelled: () => isCanvasDisposed.current,
        onSuccess: () => {
          // Restore text elements for this page
          if (pages[index].canvasData?.textElements && fabricCanvas.current) {
            pages[index].canvasData.textElements.forEach((element: any) => {
              const tb = new Textbox(element.text, {
                left: element.left,
                top: element.top,
                fontSize: element.fontSize,
                fontWeight: element.fontWeight,
                fontFamily: element.fontFamily,
                fill: element.fill,
                width: element.width,
                textAlign: element.textAlign,
                angle: element.angle || 0,
                originX: 'center',
                originY: 'center',
                cornerStyle: 'circle',
                cornerColor: '#3b82f6'
              });
              (tb as any).isLocked = element.locked || false;
              fabricCanvas.current?.add(tb);
            });
            fabricCanvas.current?.requestRenderAll();
          }
        },
        onError: () => {
          alert('Failed to load page background');
        },
      });
    } catch (error) {
      console.error('Error switching page:', error);
      alert('Error switching page');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
      {/* Canvas Area */}
      <div ref={containerRef} className="flex-1 p-8 flex justify-center items-center bg-slate-200 overflow-auto">
        <div className="shadow-2xl rounded-lg overflow-hidden border border-gray-200 bg-white">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col p-6 gap-6 overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-4">
          <h1 className="text-xl font-bold text-gray-800">Create Template</h1>
          <button
            onClick={() => router.push('/admin')}
            aria-label="Close and return to admin panel"
            title="Close (Esc)"
            className="text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 transition"
          >
            ✕
          </button>
        </div>

        {/* Template Info Section */}
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
          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-purple-700">
              {pages.length > 0 ? `Page ${currentPageIndex + 1} Background` : 'Template Background Image'}
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
                '📷 Upload Background Image'
              )}
            </label>
            {templateImageUrl && templateImageUrl !== '/images/template.png' && (
              <p className="text-xs text-purple-600 truncate">Image uploaded ✓</p>
            )}
          </div>

          {/* Pages List - show when pages exist */}
          {pages.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <label className="text-xs font-semibold text-purple-700">Pages ({pages.length})</label>
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
                      aria-label={`Switch to page ${idx + 1}${currentPageIndex === idx ? ' (current)' : ''}`}
                      aria-current={currentPageIndex === idx ? 'page' : undefined}
                      className="text-sm font-semibold flex-1 text-left focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 transition"
                    >
                      Page {idx + 1}
                    </button>
                    <button
                      onClick={() => deletePage(idx)}
                      aria-label={`Delete page ${idx + 1}`}
                      title="Delete page"
                      className="text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-2 py-0.5 text-xs font-bold transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Page Button */}
          <button
            onClick={addPage}
            disabled={isUploadingImage}
            aria-label="Add new page to multipage template"
            title="Add Page (Upload background image)"
            className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-bold transition shadow-md flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-700"
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
          <button
            onClick={saveTemplate}
            disabled={isSaving || !templateName.trim()}
            aria-label="Save template to database"
            title="Save Template (Ctrl+S)"
            className="w-full h-12 bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white rounded-lg text-sm font-bold transition shadow-md flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving Template...
              </>
            ) : (
              '💾 Save Template to Database'
            )}
          </button>
        </div>

        <button
          onClick={addText}
          aria-label="Add a new text layer to the canvas"
          title="Add Text Layer (Ctrl+T)"
          className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-all transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
        >
          + Add Text Layer
        </button>

        {active ? (
          <div className="space-y-4">
            {/* Text Content Section */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
              <label className="text-xs font-semibold text-gray-700">📝 Text Content</label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                rows={3}
                value={textValue}
                onChange={(e) => handleAttributeChange('text', e.target.value)}
                placeholder="Enter your text here..."
              />
            </div>

            {/* Text Formatting Section */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
              <label className="text-xs font-semibold text-gray-700">🎨 Formatting</label>

              {/* Font Selection */}
              <div className="relative">
                <label className="text-xs text-gray-600 font-medium mb-1 block">Font Style</label>
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
                  className="w-full p-2.5 border border-gray-300 rounded-lg bg-white outline-none hover:border-blue-400 focus:ring-2 focus:ring-blue-500 text-sm font-medium"
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

              {/* Size, Color, Bold Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-600 font-medium mb-1 block">Size</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="range"
                      min="8"
                      max="120"
                      className="w-full"
                      value={fontSize}
                      onChange={(e) => handleAttributeChange('fontSize', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="text-xs text-center text-gray-600 mt-1 font-semibold">{fontSize}px</div>
                </div>

                <div>
                  <label className="text-xs text-gray-600 font-medium mb-1 block">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-full h-10 p-1 border border-gray-300 rounded-lg cursor-pointer"
                      value={fillColor}
                      onChange={(e) => handleAttributeChange('fill', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-600 font-medium mb-1 block">Bold</label>
                  <button
                    onClick={toggleBold}
                    className={`w-full h-10 rounded-lg text-sm font-bold transition flex items-center justify-center ${bold
                        ? 'bg-gray-900 hover:bg-gray-800 text-white shadow-md'
                        : 'bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700'
                      }`}
                  >
                    B
                  </button>
                </div>
              </div>

              {/* Position on Canvas */}
              <div>
                <label className="text-xs text-gray-600 font-medium mb-1 block">Position on Canvas</label>
                <div className="grid grid-cols-3 gap-2">
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

            {/* Lock Section */}
            <div className="bg-red-50 p-4 rounded-xl border border-red-200">
              <button
                onClick={() => {
                  if (active) {
                    const isLocked = !(active as any).isLocked;
                    (active as any).isLocked = isLocked;
                    setIsTextLocked(isLocked);
                    fabricCanvas.current?.requestRenderAll();
                  }
                }}
                aria-label={`${isTextLocked ? 'Unlock' : 'Lock'} this text field`}
                aria-pressed={isTextLocked}
                title={`${isTextLocked ? 'Unlock' : 'Lock'} field - prevents user editing`}
                className={`w-full h-10 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 ${isTextLocked
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-md focus:ring-red-800'
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-md focus:ring-green-700'
                  }`}
              >
                {isTextLocked ? '🔒 Lock Field' : '🔓 Unlock Field'}
              </button>
              <p className="text-xs text-gray-600 text-center mt-2">
                {isTextLocked ? 'Locked - users cannot edit' : 'Unlocked - users can edit'}
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