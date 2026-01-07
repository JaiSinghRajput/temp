// ============================================================================
// REFACTORED TEMPLATE EDITOR - Key Improvements:
// 1. Split into smaller, focused hooks
// 2. Fix duplicate text layers bug in edit mode
// 3. Better loading state management
// 4. Cleaner coordinate transformation logic
// 5. Separated concerns (UI, canvas, data management)
// ============================================================================

'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, Textbox } from 'fabric';
import { loadCustomFonts } from '@/lib/canvas-renderer';
import { uploadDataUrlToCloudinary, uploadToCloudinary } from '@/lib/cloudinary';
import { loadCanvasBackgroundImage, validateImageFile } from '@/lib/canvas-utils';
import { COLOR_OPTIONS } from '@/lib/constants';
import { ColorSelect } from '@/components/ui/color-select';
import colorService from '@/services/color.service';
import type { Category, Subcategory, CustomFont } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const DEFAULT_TEMPLATE_IMAGE = '';

type EditorMode = 'create' | 'edit';

interface TemplateEditorProps {
  mode: EditorMode;
  initialData?: any | null;
  templateId?: string;
  onSave?: (payload: any) => Promise<void>;
  onCancel?: () => void;
}

// ============================================================================
// COORDINATE TRANSFORMATION UTILITIES
// ============================================================================
const CoordinateUtils = {
  absoluteToRelative: (position: any, originalWidth: number, originalHeight: number) => {
    if (!originalWidth || !originalHeight) return position;
    return {
      ...position,
      leftPercent: (position.left / originalWidth) * 100,
      topPercent: (position.top / originalHeight) * 100,
      widthPercent: (position.width / originalWidth) * 100,
      fontSizeRatio: position.fontSize ? position.fontSize / position.width : undefined,
    };
  },

  relativeToAbsolute: (position: any, canvasWidth: number, canvasHeight: number) => {
    const hasRelative = position.leftPercent !== undefined && position.topPercent !== undefined;

    if (hasRelative) {
      const newWidth = (position.widthPercent / 100) * canvasWidth;
      const newFontSize = position.fontSizeRatio
        ? Math.max(8, newWidth * position.fontSizeRatio)
        : position.fontSize;

      return {
        ...position,
        left: (position.leftPercent / 100) * canvasWidth,
        top: (position.topPercent / 100) * canvasHeight,
        width: newWidth,
        fontSize: newFontSize,
      };
    }

    // Old format - use as-is
    return position;
  },

  normalizeToRelative: (textData: any, originalWidth: number, originalHeight: number) => {
    if (textData.leftPercent !== undefined) {
      return textData; // Already in new format
    }

    // Convert old format to new format
    return {
      ...textData,
      leftPercent: (textData.left / originalWidth) * 100,
      topPercent: (textData.top / originalHeight) * 100,
      widthPercent: (textData.width / originalWidth) * 100,
      fontSizeRatio: textData.fontSize ? textData.fontSize / textData.width : undefined,
    };
  },
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

// Hook for managing fonts
const useFontManager = () => {
  const [loadedCustomFonts, setLoadedCustomFonts] = useState<CustomFont[]>([]);
  const [managedFonts, setManagedFonts] = useState<CustomFont[]>([]);
  const [isFontsLoading, setIsFontsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadManagedFonts = async () => {
      try {
        const res = await fetch('/api/font-cdn-links');
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) return;

        const fonts: CustomFont[] = json.data.map((f: any) => ({
          name: f.font_name,
          url: f.cdn_link
        }));

        await loadCustomFonts(fonts);

        if (!cancelled) {
          setManagedFonts(fonts);
          setLoadedCustomFonts(fonts);
          setIsFontsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setIsFontsLoading(false);
        }
      }
    };

    loadManagedFonts();
    return () => { cancelled = true; };
  }, []);

  const addFont = async (fontName: string, cdnLink: string) => {
    const newFont = { name: fontName.trim(), url: cdnLink.trim() };
    setLoadedCustomFonts(prev => [...prev, newFont]);
    setManagedFonts(prev => [...prev, newFont]);
  };

  return { loadedCustomFonts, managedFonts, isFontsLoading, addFont };
};

// Hook for managing categories and subcategories
const useCategoryManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categoryId, setCategoryId] = useState(1);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        if (json.success) setCategories(json.data);
      } catch (e) {
        console.error('Failed to load categories:', e);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadSubcategories = async () => {
      try {
        setSubcategoryId(null);
        const res = await fetch(`/api/subcategories?category_id=${categoryId}`);
        const json = await res.json();
        if (json.success) setSubcategories(json.data);
      } catch (e) {
        console.error('Failed to load subcategories:', e);
      }
    };
    if (categoryId) loadSubcategories();
  }, [categoryId]);

  return {
    categories,
    subcategories,
    categoryId,
    setCategoryId,
    subcategoryId,
    setSubcategoryId
  };
};

// Hook for managing colors
const useColorManager = () => {
  const [colors, setColors] = useState<Array<{ id: number; name: string; hex_code: string }>>([]);
  const [cardColor, setCardColor] = useState('');

  useEffect(() => {
    const loadColors = async () => {
      try {
        const fetchedColors = await colorService.getAll();
        if (fetchedColors.length > 0) {
          setColors(fetchedColors);
          setCardColor(fetchedColors[0].hex_code);
        }
      } catch (err) {
        console.error('Error loading colors:', err);
        setCardColor(COLOR_OPTIONS[0].value);
      }
    };
    loadColors();
  }, []);

  return { colors, cardColor, setCardColor };
};

// ============================================================================
// TEXT ELEMENT UTILITIES
// ============================================================================
const TextElementUtils = {
  deduplicateElements: (elements: any[]) => {
    const seen = new Set<string>();
    return elements.filter((el: any) => {
      const key = String(el.id ?? `${el.text}-${el.left}-${el.top}-${el.fontSize}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  extractTextElements: (canvas: Canvas, canvasWidth: number, canvasHeight: number) => {
    const objects = canvas.getObjects();
    return objects.filter(o => o instanceof Textbox).map((obj, i) => {
      const t = obj as Textbox;
      t.setCoords();

      const position = CoordinateUtils.absoluteToRelative(
        { left: t.left, top: t.top, width: t.width },
        canvasWidth,
        canvasHeight
      );

      return {
        id: String(i + 1),
        text: t.text,
        label: `Text Field ${i + 1}`,
        left: position.left,
        top: position.top,
        leftPercent: position.leftPercent,
        topPercent: position.topPercent,
        fontSize: t.fontSize,
        fontSizeRatio: position.fontSizeRatio,
        fontWeight: t.fontWeight,
        fontFamily: t.fontFamily,
        fill: t.fill,
        width: position.width,
        widthPercent: position.widthPercent,
        scaleX: t.scaleX ?? 1,
        scaleY: t.scaleY ?? 1,
        textAlign: t.textAlign,
        angle: t.angle || 0,
        locked: (t as any).isLocked || false,
        canvasWidth,
        canvasHeight,
      };
    });
  },

  createTextbox: (textData: any, canvasWidth: number, canvasHeight: number) => {
    const scaledPosition = CoordinateUtils.relativeToAbsolute(
      textData,
      canvasWidth,
      canvasHeight
    );

    const tb = new Textbox(textData.text || '', {
      left: scaledPosition.left,
      top: scaledPosition.top,
      fontSize: scaledPosition.fontSize || textData.fontSize,
      fontFamily: textData.fontFamily,
      fontWeight: textData.fontWeight || 'normal',
      fill: textData.fill,
      width: scaledPosition.width,
      scaleX: textData.scaleX ?? 1,
      scaleY: textData.scaleY ?? 1,
      textAlign: textData.textAlign,
      angle: textData.angle || 0,
      originX: 'center',
      originY: 'center',
      cornerStyle: 'circle',
      cornerColor: '#3b82f6',
    });

    (tb as any).isLocked = Boolean(textData.locked);
    tb.setCoords();
    return tb;
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function TemplateEditor({
  mode,
  initialData,
  templateId,
  onSave,
  onCancel,
}: TemplateEditorProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvas = useRef<Canvas | null>(null);
  const isCanvasDisposed = useRef(false);
  const textElementsLoadedRef = useRef(false); // NEW: Track if text elements are loaded

  // Custom hooks
  const { loadedCustomFonts, managedFonts, isFontsLoading, addFont } = useFontManager();
  const { categories, subcategories, categoryId, setCategoryId, subcategoryId, setSubcategoryId } = useCategoryManager();
  const { colors, cardColor, setCardColor } = useColorManager();

  // UI State
  const [active, setActive] = useState<Textbox | null>(null);
  const [textValue, setTextValue] = useState('');
  const [fontSize, setFontSize] = useState(40);
  const [bold, setBold] = useState(false);
  const [fillColor, setFillColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [isTextLocked, setIsTextLocked] = useState(false);

  // Font search state
  const [fontSearchQuery, setFontSearchQuery] = useState('');
  const [showFontSuggestions, setShowFontSuggestions] = useState(false);
  const [fontName, setFontName] = useState("");
  const [cdnLink, setCdnLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Template state
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [pricingType, setPricingType] = useState<'free' | 'premium'>('free');
  const [price, setPrice] = useState('');

  // Page and image state
  const [pages, setPages] = useState<Array<{
    imageUrl: string;
    publicId: string;
    canvasData?: any;
    previewImageUrl?: string | null;
    previewPublicId?: string | null
  }>>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [templateImageUrl, setTemplateImageUrl] = useState(DEFAULT_TEMPLATE_IMAGE);
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState<string | null>(null);
  const [backgroundId, setBackgroundId] = useState<number | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewPublicId, setPreviewPublicId] = useState<string | null>(null);

  // Loading states
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(mode === 'edit');
  const [isContentReady, setIsContentReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingPreview, setIsUploadingPreview] = useState(false);

  const isMultipage = pages.length > 1;

  // ============================================================================
  // INITIALIZE FROM EDIT DATA
  // ============================================================================
  useEffect(() => {
    if (mode !== 'edit' || !initialData) return;

    textElementsLoadedRef.current = false; // Reset flag

    setTemplateName(initialData.name);
    setTemplateDescription(initialData.description || '');
    setCategoryId(initialData.category_id || 1);
    setSubcategoryId(initialData.subcategory_id || null);
    setPricingType(initialData.pricing_type || 'free');
    setPrice(String(initialData.price || ''));
    setCardColor(initialData.color || COLOR_OPTIONS[0].value);
    setBackgroundId(initialData.background_id || null);
    setPreviewImageUrl(initialData.thumbnail_uri || null);
    setPreviewPublicId(initialData.thumbnail_public_id || null);

    let imageUrl = initialData.template_image_url;

    if (initialData.is_multipage && initialData.pages?.length) {
      const normalizedPages = initialData.pages.map((p: any) => ({
        imageUrl: p.image_url || p.imageUrl,
        publicId: (p.cloudinary_public_id || p.cloudinaryPublicId) ?? null,
        previewImageUrl: p.preview_image_url || p.previewImageUrl || null,
        previewPublicId: p.preview_public_id || p.previewPublicId || null,
        canvasData: {
          textElements: p.canvas_data?.textElements || p.canvasData?.textElements || [],
          canvasWidth: p.canvas_data?.canvasWidth || p.canvasData?.canvasWidth,
          canvasHeight: p.canvas_data?.canvasHeight || p.canvasData?.canvasHeight,
        },
      }));
      setPages(normalizedPages);
      imageUrl = normalizedPages[0]?.imageUrl || imageUrl;
    }

    if (imageUrl && imageUrl !== DEFAULT_TEMPLATE_IMAGE) {
      setTemplateImageUrl(imageUrl);
      setCloudinaryPublicId(initialData.cloudinary_public_id || null);
      setIsBackgroundLoading(true);
    } else {
      setIsBackgroundLoading(false);
    }
  }, [mode, initialData]);

  // ============================================================================
  // CANVAS INITIALIZATION
  // ============================================================================
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    isCanvasDisposed.current = false;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const canvas = new Canvas(canvasRef.current, {
      backgroundColor: '#ffffff',
      width: containerWidth - 64,
      height: containerHeight - 64,
    });
    fabricCanvas.current = canvas;

    const syncSidebar = () => {
      const selected = canvas.getActiveObject();
      if (selected instanceof Textbox) {
        setActive(selected);
        setTextValue(selected.text || '');
        setFontSize(selected.fontSize || 40);
        setBold(selected.fontWeight === 'bold');
        setFillColor((selected.fill as string) || '#000000');
        setFontFamily(selected.fontFamily || 'Arial');
        setIsTextLocked((selected as any).isLocked || false);
      } else {
        setActive(null);
      }
    };

    const handleObjectModified = (e: any) => {
      const target = e.target;
      if (!(target instanceof Textbox)) return;

      if (!(target as any)._prevWidth) {
        (target as any)._prevWidth = target.width;
        (target as any)._prevHeight = target.height;
        (target as any)._prevFontSize = target.fontSize;
        return;
      }

      const prevWidth = (target as any)._prevWidth;
      const prevHeight = (target as any)._prevHeight;
      const currentWidth = target.width;
      const currentHeight = target.height;
      const currentFontSize = target.fontSize || 40;

      const widthChanged = Math.abs(currentWidth - prevWidth) > 1;
      const heightChanged = Math.abs(currentHeight - prevHeight) > 1;

      if (widthChanged && heightChanged) {
        const prevArea = prevWidth * prevHeight;
        const currentArea = currentWidth * currentHeight;
        const areaScaleFactor = currentArea / prevArea;
        const newFontSize = Math.max(8, Math.round(currentFontSize * Math.sqrt(areaScaleFactor)));

        if (newFontSize !== currentFontSize) {
          target.set({ fontSize: newFontSize, dirty: true, objectCaching: false } as any);
          (target as any)._clearCache?.();
          target.initDimensions();
          target.setCoords();
          canvas.requestRenderAll();
          setFontSize(newFontSize);
          setActive({ ...target } as Textbox);
        }

        (target as any)._prevFontSize = newFontSize;
      }

      (target as any)._prevWidth = currentWidth;
      (target as any)._prevHeight = currentHeight;
      target.setCoords();
    };

    canvas.on('selection:created', syncSidebar);
    canvas.on('selection:updated', syncSidebar);
    canvas.on('selection:cleared', () => setActive(null));
    canvas.on('object:modified', handleObjectModified);
    canvas.on('text:changed', (e) => {
      if (e.target instanceof Textbox) setTextValue(e.target.text || '');
    });

    return () => {
      isCanvasDisposed.current = true;
      canvas.dispose();
      fabricCanvas.current = null;
    };
  }, []);

  // ============================================================================
  // LOAD BACKGROUND
  // ============================================================================
  useEffect(() => {
    if (!fabricCanvas.current || !containerRef.current) return;

    const loadBackground = async () => {
      setIsBackgroundLoading(true);
      try {
        await loadCanvasBackgroundImage({
          canvas: fabricCanvas.current!,
          imageUrl: templateImageUrl,
          containerWidth: containerRef.current!.clientWidth,
          containerHeight: containerRef.current!.clientHeight,
          isCancelled: () => isCanvasDisposed.current,
          onSuccess: () => {
            setIsBackgroundLoading(false);
          },
          onError: () => {
            setIsBackgroundLoading(false);
            if (templateImageUrl !== DEFAULT_TEMPLATE_IMAGE) {
              alert('Failed to load background image. Using default.');
            }
          },
        });
      } catch (err) {
        setIsBackgroundLoading(false);
      }
    };

    loadBackground();
  }, [templateImageUrl]);

  // ============================================================================
  // COORDINATE CONTENT READY STATE
  // ============================================================================
  useEffect(() => {
    if (!isFontsLoading && !isBackgroundLoading) {
      setIsContentReady(true);
    }
  }, [isFontsLoading, isBackgroundLoading]);

  // ============================================================================
  // LOAD TEXT ELEMENTS (EDIT MODE) - FIXED DUPLICATE BUG
  // ============================================================================
  useEffect(() => {
    // CRITICAL FIX: Only run once and only when ready
    if (!fabricCanvas.current || mode !== 'edit' || !initialData) return;
    if (isFontsLoading || !isContentReady) return;
    if (textElementsLoadedRef.current) return; // Already loaded

    textElementsLoadedRef.current = true; // Mark as loaded

    const loadTextElements = async () => {
      const initialPageText = initialData.pages?.[0]?.canvasData?.textElements || [];
      const singlePageText = initialData.canvas_data?.textElements || [];

      // For multipage, ONLY use page data to avoid duplication
      const rawTextElements = initialData.is_multipage && initialPageText.length
        ? initialPageText
        : singlePageText;

      if (!rawTextElements.length) return;

      const dedupedTextElements = TextElementUtils.deduplicateElements(rawTextElements);

      const originalCanvasWidth = initialData.canvas_data?.canvasWidth || 800;
      const originalCanvasHeight = initialData.canvas_data?.canvasHeight || 600;

      // Normalize to new format with percentages
      const normalizedElements = dedupedTextElements.map((textData: any) =>
        CoordinateUtils.normalizeToRelative(textData, originalCanvasWidth, originalCanvasHeight)
      );

      // Collect and load fonts
      const uniqueFonts = Array.from(
        new Set(normalizedElements.map((t: any) => t.fontFamily).filter(Boolean))
      );
      const fontsToLoad: CustomFont[] = [];

      for (const fontName of uniqueFonts) {
        const fontDef = managedFonts.find(f => f.name === fontName) ||
          loadedCustomFonts.find(f => f.name === fontName);
        if (fontDef) fontsToLoad.push(fontDef);
      }

      const canvasCustomFonts = initialData.canvas_data?.customFonts || [];
      if (Array.isArray(canvasCustomFonts)) {
        for (const font of canvasCustomFonts) {
          if (!fontsToLoad.some(f => f.name === font.name)) {
            fontsToLoad.push(font);
          }
        }
      }

      if (fontsToLoad.length > 0) {
        try {
          await loadCustomFonts(fontsToLoad);
          const fontLoadPromises = fontsToLoad.map(font =>
            document.fonts.load(`16px "${font.name}"`)
          );
          await Promise.all(fontLoadPromises);
          await document.fonts.ready;
        } catch (err) {
          console.error('Font loading error:', err);
        }
      }

      // Create textboxes
      normalizedElements.forEach((textData: any) => {
        const tb = TextElementUtils.createTextbox(
          textData,
          fabricCanvas.current?.width || 800,
          fabricCanvas.current?.height || 600
        );
        fabricCanvas.current?.add(tb);
      });

      fabricCanvas.current?.requestRenderAll();
    };

    loadTextElements().catch(err => {
      console.error('Error loading text elements:', err);
    });
  }, [initialData, mode, managedFonts, loadedCustomFonts, isFontsLoading, isContentReady]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleAttributeChange = async (key: string, value: any) => {
    if (!fabricCanvas.current) return;
    const target = fabricCanvas.current.getActiveObject?.() as Textbox | null;
    if (!target) return;

    if (key === 'fontFamily') {
      const fontDef = managedFonts.find(f => f.name === value) ||
        loadedCustomFonts.find(f => f.name === value);
      if (!fontDef) {
        alert('This font is not available in the database.');
        return;
      }

      try {
        await loadCustomFonts([fontDef]);
        await document.fonts.load(`${target.fontSize || 40}px "${value}"`);
        await document.fonts.ready;

        target.set({
          fontFamily: value,
          dirty: true,
          objectCaching: false
        } as any);

        setFontFamily(value);

        (target as any)._clearCache?.();
        target.initDimensions();
        target.setCoords();
        fabricCanvas.current.requestRenderAll();

        setTimeout(() => {
          if (fabricCanvas.current && !isCanvasDisposed.current) {
            (target as any)._clearCache?.();
            target.initDimensions();
            target.setCoords();
            fabricCanvas.current.requestRenderAll();
          }
        }, 150);

        setActive(target);
        return;
      } catch (err) {
        alert('Failed to load font. Please try again.');
        return;
      }
    }

    const updateObj: any = { [key]: value, dirty: true, objectCaching: false };

    if (key === 'fontSize') {
      const currentWidth = (target.width || 250) as number;
      const currentFontSize = (target.fontSize || 40) as number;
      const scaleFactor = value / currentFontSize;
      updateObj.width = currentWidth * scaleFactor;
      setFontSize(value);
    } else if (key === 'text') {
      setTextValue(value);
    } else if (key === 'fill') {
      setFillColor(value);
    } else if (key === 'fontWeight') {
      setBold(value === 'bold');
    }

    target.set(updateObj);
    (target as any)._clearCache?.();
    target.initDimensions();
    target.setCoords();
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
      cornerColor: '#3b82f6',
    });
    canvas.add(tb);
    canvas.setActiveObject(tb);
    canvas.requestRenderAll();
  };

  const handleAddFont = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fontName.trim() || !cdnLink.trim()) return;

    setSubmitting(true);
    try {
      await fetch("/api/font-cdn-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          font_name: fontName.trim(),
          cdn_link: cdnLink.trim(),
        }),
      });
      await addFont(fontName, cdnLink);
      setFontName("");
      setCdnLink("");
    } catch (err) {
      alert('Failed to add font');
    } finally {
      setSubmitting(false);
    }
  };

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

      if (pages.length > 0) {
        const textElements = TextElementUtils.extractTextElements(
          fabricCanvas.current!,
          fabricCanvas.current?.width || 800,
          fabricCanvas.current?.height || 600
        );

        const updatedPages = [...pages];
        updatedPages[currentPageIndex] = {
          ...updatedPages[currentPageIndex],
          imageUrl: result.secureUrl,
          publicId: result.publicId,
          canvasData: {
            textElements,
            canvasWidth: fabricCanvas.current?.width || 800,
            canvasHeight: fabricCanvas.current?.height || 600,
          },
        };
        setPages(updatedPages);

        if (fabricCanvas.current) {
          fabricCanvas.current.clear();
        }
      }
    } catch (error: any) {
      alert(error.message || 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };
  const absoluteToRelative = (position: any, originalWidth: number, originalHeight: number) => {
    if (!originalWidth || !originalHeight) return position;
    return {
      ...position,
      leftPercent: (position.left / originalWidth) * 100,
      topPercent: (position.top / originalHeight) * 100,
      widthPercent: (position.width / originalWidth) * 100,
      fontSizeRatio: position.fontSize ? position.fontSize / position.width : undefined,
    };
  };

  // Convert relative coordinates back to absolute based on current canvas size
  const relativeToAbsolute = (position: any, canvasWidth: number, canvasHeight: number) => {
    const hasRelative = position.leftPercent !== undefined && position.topPercent !== undefined;

    if (hasRelative) {
      // New format with percentage - scale to new canvas size
      const newWidth = (position.widthPercent / 100) * canvasWidth;
      const newFontSize = position.fontSizeRatio
        ? Math.max(8, newWidth * position.fontSizeRatio)
        : position.fontSize;

      return {
        ...position,
        left: (position.leftPercent / 100) * canvasWidth,
        top: (position.topPercent / 100) * canvasHeight,
        width: newWidth,
        fontSize: newFontSize,
      };
    }

    // Old format without percentages - DON'T SCALE, use as-is
    // This preserves existing templates on their original canvas size
    return position;
  };
  const handlePreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setIsUploadingPreview(true);
    const input = e.target;
    try {
      const uploadResult = await uploadToCloudinary(file);
      setPreviewImageUrl(uploadResult.secureUrl);
      setPreviewPublicId(uploadResult.publicId);
    } catch (error: any) {
      alert(error.message || 'Failed to upload preview image');
    } finally {
      setIsUploadingPreview(false);
      input.value = '';
    }
  };

  const handlePagePreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setIsUploadingPreview(true);
    const input = e.target;
    try {
      const uploadResult = await uploadToCloudinary(file);
      const updated = [...pages];
      if (!updated[currentPageIndex]) {
        updated[currentPageIndex] = {
          imageUrl: '',
          publicId: '',
          canvasData: undefined,
          previewImageUrl: uploadResult.secureUrl,
          previewPublicId: uploadResult.publicId,
        };
      } else {
        updated[currentPageIndex] = {
          ...updated[currentPageIndex],
          previewImageUrl: uploadResult.secureUrl,
          previewPublicId: uploadResult.publicId,
        };
      }
      setPages(updated);
    } catch (error: any) {
      alert(error.message || 'Failed to upload page preview');
    } finally {
      setIsUploadingPreview(false);
      input.value = '';
    }
  };

  const buildCurrentPageSnapshot = () => {
    if (!fabricCanvas.current || !cloudinaryPublicId) return null;

    const objects = fabricCanvas.current.getObjects();
    const canvasWidth = fabricCanvas.current.width;
    const canvasHeight = fabricCanvas.current.height;

    const textElements = objects.filter((obj) => obj instanceof Textbox).map((obj, i) => {
      const textbox = obj as Textbox;
      // Force coordinate calculation to ensure positions are accurate
      textbox.setCoords();

      // Convert to relative coordinates
      const position = absoluteToRelative({
        left: textbox.left,
        top: textbox.top,
        width: textbox.width,
      }, canvasWidth, canvasHeight);

      return {
        id: String(i + 1),
        text: textbox.text || '',
        label: `Text Field ${i + 1}`,
        left: position.left,
        top: position.top,
        leftPercent: position.leftPercent,
        topPercent: position.topPercent,
        fontSize: textbox.fontSize,
        fontSizeRatio: position.fontSizeRatio,
        fontWeight: textbox.fontWeight,
        fontFamily: textbox.fontFamily,
        fill: textbox.fill,
        width: position.width,
        widthPercent: position.widthPercent,
        scaleX: textbox.scaleX ?? 1,
        scaleY: textbox.scaleY ?? 1,
        textAlign: textbox.textAlign,
        angle: textbox.angle || 0,
        locked: (textbox as any).isLocked || false,
        canvasWidth,
        canvasHeight,
      };
    });

    return {
      imageUrl: templateImageUrl,
      publicId: cloudinaryPublicId,
      canvasData: {
        textElements,
        canvasWidth,
        canvasHeight,
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
              textElements: [],
              canvasWidth: fabricCanvas.current?.width || 800,
              canvasHeight: fabricCanvas.current?.height || 600,
            },
          };
          updatedPages = [...updatedPages, newPage];
          setPages(updatedPages);

          setTimeout(() => switchPage(updatedPages.length - 1), 100);
        } else {
          alert('Failed to upload image');
        }
      } catch (error) {
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

    // Save current page data before switching with relative coordinates
    if (pages[currentPageIndex]) {
      const objects = fabricCanvas.current.getObjects();
      const currentCanvasWidth = fabricCanvas.current.width;
      const currentCanvasHeight = fabricCanvas.current.height;

      const textElements = objects.filter((obj) => obj instanceof Textbox).map((obj, i) => {
        const textbox = obj as Textbox;
        // Force coordinate calculation to ensure positions are accurate
        textbox.setCoords();

        // Convert to relative coordinates
        const position = absoluteToRelative({
          left: textbox.left,
          top: textbox.top,
          width: textbox.width,
        }, currentCanvasWidth, currentCanvasHeight);

        return {
          id: String(i + 1),
          text: textbox.text || '',
          label: `Text Field ${i + 1}`,
          left: position.left,
          top: position.top,
          leftPercent: position.leftPercent,
          topPercent: position.topPercent,
          fontSize: textbox.fontSize,
          fontSizeRatio: position.fontSizeRatio,
          fontWeight: textbox.fontWeight,
          fontFamily: textbox.fontFamily,
          fill: textbox.fill,
          width: position.width,
          widthPercent: position.widthPercent,
          scaleX: textbox.scaleX ?? 1,
          scaleY: textbox.scaleY ?? 1,
          textAlign: textbox.textAlign,
          angle: textbox.angle || 0,
          locked: (textbox as any).isLocked || false,
          canvasWidth: currentCanvasWidth,
          canvasHeight: currentCanvasHeight,
        };
      });

      // Create a new pages array with updated current page data
      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = {
        ...updatedPages[currentPageIndex],
        canvasData: {
          textElements,
          canvasWidth: currentCanvasWidth,
          canvasHeight: currentCanvasHeight,
        },
      };
      setPages(updatedPages);
    }

    fabricCanvas.current.clear();
    fabricCanvas.current.discardActiveObject();
    setActive(null);

    setCurrentPageIndex(index);
    setTemplateImageUrl(pages[index].imageUrl);
    setCloudinaryPublicId(pages[index].publicId);

    try {
      await loadCanvasBackgroundImage({
        canvas: fabricCanvas.current,
        imageUrl: pages[index].imageUrl,
        containerWidth: containerRef.current.clientWidth,
        containerHeight: containerRef.current.clientHeight,
        isCancelled: () => isCanvasDisposed.current,
        onSuccess: async () => {
          if (pages[index].canvasData?.textElements && fabricCanvas.current) {
            const fontsToLoad = pages[index].canvasData.textElements
              .map((t: any) => loadedCustomFonts.find((f) => f.name === t.fontFamily) || managedFonts.find((f) => f.name === t.fontFamily))
              .filter(Boolean) as CustomFont[];
            if (fontsToLoad.length) {
              try {
                await loadCustomFonts(fontsToLoad);
              } catch (err) {
                console.error('Failed to preload fonts for page switch', err);
              }
            }

            const newCanvasWidth = fabricCanvas.current.width;
            const newCanvasHeight = fabricCanvas.current.height;

            pages[index].canvasData.textElements.forEach((element: any) => {
              // Only scale if using new percentage format
              const hasPercentages = element.leftPercent !== undefined && element.topPercent !== undefined;
              const scaledPosition = hasPercentages
                ? relativeToAbsolute(element, newCanvasWidth, newCanvasHeight)
                : element;

              const tb = new Textbox(element.text, {
                left: scaledPosition.left,
                top: scaledPosition.top,
                fontSize: scaledPosition.fontSize || element.fontSize,
                fontWeight: element.fontWeight,
                fontFamily: element.fontFamily,
                fill: element.fill,
                width: scaledPosition.width,
                scaleX: element.scaleX ?? 1,
                scaleY: element.scaleY ?? 1,
                textAlign: element.textAlign,
                angle: element.angle || 0,
                originX: 'center',
                originY: 'center',
                cornerStyle: 'circle',
                cornerColor: '#3b82f6',
              });
              (tb as any).isLocked = element.locked || false;
              // Ensure coordinates are properly set
              tb.setCoords();
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
      alert('Error switching page');
    }
  };

  const handleSave = async () => {
    if (!fabricCanvas.current || !templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    setIsSaving(true);

    try {
      const objects = fabricCanvas.current.getObjects();
      const canvasWidth = fabricCanvas.current.width;
      const canvasHeight = fabricCanvas.current.height;

      const textElements = objects.filter((o) => o instanceof Textbox).map((obj, i) => {
        const t = obj as Textbox;
        // Force coordinate calculation to ensure positions are accurate
        t.setCoords();

        // Convert to relative coordinates for responsive scaling
        const position = absoluteToRelative({
          left: t.left,
          top: t.top,
          width: t.width,
        }, canvasWidth, canvasHeight);

        return {
          id: String(i + 1),
          text: t.text,
          label: `Text Field ${i + 1}`,
          left: position.left,
          top: position.top,
          leftPercent: position.leftPercent,
          topPercent: position.topPercent,
          fontSize: t.fontSize,
          fontSizeRatio: position.fontSizeRatio,
          fontWeight: t.fontWeight,
          fontFamily: t.fontFamily,
          fill: t.fill,
          width: position.width,
          widthPercent: position.widthPercent,
          scaleX: t.scaleX ?? 1,
          scaleY: t.scaleY ?? 1,
          textAlign: t.textAlign,
          angle: t.angle || 0,
          locked: (t as any).isLocked || false,
          canvasWidth,
          canvasHeight,
        };
      });

      // Update current page with latest canvas data if multipage
      let finalPages = pages;
      if (isMultipage && pages[currentPageIndex]) {
        const updatedPages = [...pages];
        updatedPages[currentPageIndex] = {
          ...updatedPages[currentPageIndex],
          canvasData: {
            textElements,
            canvasWidth,
            canvasHeight,
          },
        };
        finalPages = updatedPages;
      }

      let thumbSecureUrl = previewImageUrl || pages[0]?.previewImageUrl;
      let thumbPublicId = previewPublicId || pages[0]?.previewPublicId;

      if (!thumbSecureUrl) {
        const thumbnailDataURL = fabricCanvas.current.toDataURL({ format: 'png', multiplier: 0.3 });
        const thumbUpload = await uploadDataUrlToCloudinary(thumbnailDataURL, 'template-thumbnail.png');
        thumbSecureUrl = thumbUpload.secureUrl;
        thumbPublicId = thumbUpload.publicId;
      }

      let canvasData: any = {
        textElements,
        canvasWidth,
        canvasHeight,
        customFonts: loadedCustomFonts,
      };

      if (isMultipage) {
        canvasData.pages = finalPages.map((page) => ({
          backgroundId: null,
          cloudinaryPublicId: page.publicId,
          imageUrl: page.imageUrl,
          previewImageUrl: page.previewImageUrl || undefined,
          previewPublicId: page.previewPublicId || undefined,
          canvasData: page.canvasData ? { ...page.canvasData } : {
            textElements: [],
            canvasWidth: 800,
            canvasHeight: 600,
          },
        }));

        // For multipage, also include the first page's content in single-page format for backend compatibility
        if (finalPages[0]?.canvasData?.textElements) {
          canvasData.textElements = finalPages[0].canvasData.textElements;
          canvasData.canvasWidth = finalPages[0].canvasData.canvasWidth;
          canvasData.canvasHeight = finalPages[0].canvasData.canvasHeight;
        }
      }

      const payload = {
        name: templateName,
        description: templateDescription,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        color: cardColor || null,
        pricing_type: pricingType,
        price: pricingType === 'premium' ? Number(price) : 0,
        is_multipage: isMultipage,
        template_image_url: isMultipage && finalPages.length > 0 ? finalPages[0].imageUrl : templateImageUrl,
        cloudinary_public_id: isMultipage && finalPages.length > 0 ? finalPages[0].publicId : cloudinaryPublicId,
        thumbnail_uri: thumbSecureUrl,
        thumbnail_public_id: thumbPublicId,
        canvas_data: canvasData,
        background_id: backgroundId,
      };

      if (onSave) {
        await onSave(payload);
      } else if (mode === 'edit' && templateId) {
        const res = await fetch(`/api/templates/${templateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to save template');
        router.push('/admin/e-card');
      } else if (mode === 'create') {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to Create Card');
        router.push('/admin/e-card');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    } finally {
      setIsSaving(false);
    }
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      {/* Loading Overlay for Edit Mode */}
      {!isContentReady && mode === 'edit' && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-700 font-semibold">Loading template...</p>
            <p className="text-sm text-gray-500 mt-2">
              {isFontsLoading && 'Loading fonts...'}
              {!isFontsLoading && isBackgroundLoading && 'Loading background...'}
              {!isFontsLoading && !isBackgroundLoading && 'Preparing canvas...'}
            </p>
          </div>
        </div>
      )}

      <div ref={containerRef} className="flex-1 p-8 flex justify-center items-center bg-slate-200 overflow-auto">
        <div className="shadow-2xl rounded-lg overflow-hidden border border-gray-200 bg-white">
          <canvas ref={canvasRef} />
        </div>
      </div>

      <div className="w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col p-6 gap-6 overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-4">
          <h1 className="text-xl font-bold text-gray-800">
            {mode === 'create' ? 'Create Card' : 'Edit Template'}
          </h1>
          <button
            onClick={() => onCancel?.() || router.push('/admin/e-card')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ✕
          </button>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl space-y-3 border border-purple-100">
          <details>
            <summary className="cursor-pointer text-purple-700 font-semibold mb-4">
              Card Settings
            </summary>
            <div>
              <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest">
                Card Information
              </label>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Category</label>
                  <select
                    className="w-full p-2 text-sm border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                    value={categoryId}
                    onChange={(e) => setCategoryId(parseInt(e.target.value, 10) || 1)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
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
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Card Color</label>
                <ColorSelect
                  options={colors.length > 0 ? colors.map(c => ({ label: c.name, value: c.hex_code })) : COLOR_OPTIONS}
                  value={cardColor}
                  onChange={setCardColor}
                  className="w-full"
                  selectClassName="w-full border-purple-200 focus:ring-purple-400"
                />
                <div className="text-xs text-gray-600">Selected: {cardColor}</div>
              </div>

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
                    <span className="text-sm">paid</span>
                  </label>
                </div>

                {pricingType === 'premium' && (
                  <div>
                    <label className="text-xs font-semibold text-purple-700 block mb-1">Price (₹)</label>
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
            </div>
          </details>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-purple-700">
              {pages.length > 0 ? `Page ${currentPageIndex + 1} Background` : 'Card Background Image'}
            </label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
            <label
              htmlFor="image-upload"
              className="w-full h-10 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isUploadingImage ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                '📷 Upload Background'
              )}
            </label>
          </div>
          {pages.length <= 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-purple-700">Preview / Card Image (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePreviewUpload}
                className="hidden"
                id="preview-upload"
              />
              <div className="flex gap-2">
                <label
                  htmlFor="preview-upload"
                  className="flex-1 h-10 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isUploadingPreview ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading...
                    </>
                  ) : (
                    '📤 Upload Preview'
                  )}
                </label>

                {previewImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewImageUrl(null);
                      setPreviewPublicId(null);
                    }}
                    className="h-10 px-3 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-200"
                  >
                    Use generated
                  </button>
                )}
              </div>
              {previewImageUrl && (
                <details>
                  <summary className='text-blue-500'>Preview Image</summary>
                  <div className="relative h-32 bg-gray-50 border rounded-lg overflow-hidden">
                    <img src={previewImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                </details>
              )}
            </div>
          )}

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
                    <button onClick={() => switchPage(idx)} className="text-sm font-semibold flex-1 text-left">
                      Page {idx + 1}
                    </button>
                    <button onClick={() => deletePage(idx)} className="text-red-500 text-xs font-bold">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {/* Current page preview upload */}
              <div className="mt-3 space-y-2">
                <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Current Page Preview (optional)</label>
                <input type="file" accept="image/*" onChange={handlePagePreviewUpload} className="hidden" id="page-preview-upload" />
                <div className="flex gap-2">
                  <label
                    htmlFor="page-preview-upload"
                    className="flex-1 h-10 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isUploadingPreview ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                      </>
                    ) : (
                      '📤 Upload Page Preview'
                    )}
                  </label>
                  {pages[currentPageIndex]?.previewImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...pages];
                        updated[currentPageIndex] = {
                          ...updated[currentPageIndex],
                          previewImageUrl: null,
                          previewPublicId: null,
                        };
                        setPages(updated);
                      }}
                      className="h-10 px-3 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-200"
                    >
                      Use generated
                    </button>
                  )}
                </div>
                {pages[currentPageIndex]?.previewImageUrl && (
                  <details>
                    <summary className='cursor-pointer'>Page {currentPageIndex + 1} Preview Image</summary>
                    <div className="relative bg-gray-50 border rounded-lg overflow-hidden">
                      <img src={pages[currentPageIndex]?.previewImageUrl || ''} alt={`Page ${currentPageIndex + 1} preview`} className="w-full h-full object-cover" />
                    </div>
                  </details>
                )}
              </div>
            </div>
          )}

          <button
            onClick={addPage}
            disabled={isUploadingImage}
            className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-bold"
          >
            + Add Page
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || !templateName.trim()}
            className="w-full h-12 bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white rounded-lg text-sm font-bold"
          >
            {isSaving ? 'Saving...' : mode === 'edit' ? '💾 Update' : '💾 Save'}
          </button>
        </div>

        <button onClick={addText} className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg">
          + Add Text Layer
        </button>

        {active ? (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border space-y-2">
              <label className="text-xs font-semibold">📝 Text</label>
              <textarea
                className="w-full p-3 border rounded-lg text-sm resize-none"
                rows={3}
                value={textValue}
                onChange={(e) => handleAttributeChange('text', e.target.value)}
              />
            </div>

            <div className="bg-white p-4 rounded-xl border space-y-3">
              <label className="text-xs font-semibold">🎨 Format</label>

              <div className="relative">
                <label className="text-xs mb-1 block">Font</label>
                <input
                  type="text"
                  value={fontSearchQuery || fontFamily}
                  onChange={(e) => {
                    setFontSearchQuery(e.target.value);
                    setShowFontSuggestions(true);
                  }}
                  onFocus={() => setShowFontSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowFontSuggestions(false), 200)}
                  className="w-full p-2.5 border rounded-lg text-sm"
                />
                {showFontSuggestions &&
                  (() => {
                    const availableFonts = managedFonts.map((f) => f.name);
                    const filteredFonts = fontSearchQuery.trim()
                      ? availableFonts.filter((font) => font.toLowerCase().includes(fontSearchQuery.toLowerCase()))
                      : availableFonts;

                    return filteredFonts.length > 0 ? (
                      <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-white border rounded-md shadow-lg">
                        {filteredFonts.map((font) => (
                          <button
                            key={font}
                            type="button"
                            onClick={() => {
                              handleAttributeChange('fontFamily', font);
                              setFontSearchQuery('');
                              setShowFontSuggestions(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                            style={{ fontFamily: font }}
                          >
                            {font}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg px-3 py-2 text-sm text-gray-500">
                        No fonts found
                      </div>
                    );
                  })()}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs mb-1 block">Size</label>
                  <input
                    type="range"
                    min="8"
                    max="120"
                    className="w-full"
                    value={fontSize}
                    onChange={(e) => handleAttributeChange('fontSize', parseInt(e.target.value) || 1)}
                  />
                  <input type="number" className="w-full p-2 border rounded-lg text-sm" value={fontSize} onChange={(e) => handleAttributeChange('fontSize', parseInt(e.target.value))} />
                </div>

                <div>
                  <label className="text-xs mb-1 block">Color</label>
                  <input
                    type="color"
                    className="w-full h-10 border rounded-lg cursor-pointer"
                    value={fillColor}
                    onChange={(e) => handleAttributeChange('fill', e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs mb-1 block">Bold</label>
                  <button
                    onClick={toggleBold}
                    className={`w-full h-10 rounded-lg font-bold ${bold ? 'bg-gray-900 text-white' : 'bg-gray-100 border'
                      }`}
                  >
                    B
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs mb-1 block">Position</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      if (active && fabricCanvas.current) {
                        active.set({ left: 50, originX: 'left' });
                        active.setCoords();
                        fabricCanvas.current.requestRenderAll();
                      }
                    }}
                    className="h-10 rounded-lg bg-gray-100 border"
                  >
                    ⬅
                  </button>
                  <button
                    onClick={() => {
                      if (active && fabricCanvas.current) {
                        active.set({ left: fabricCanvas.current.width / 2, originX: 'center' });
                        active.setCoords();
                        fabricCanvas.current.requestRenderAll();
                      }
                    }}
                    className="h-10 rounded-lg bg-gray-100 border"
                  >
                    ↔
                  </button>
                  <button
                    onClick={() => {
                      if (active && fabricCanvas.current) {
                        active.set({ left: fabricCanvas.current.width - 50, originX: 'right' });
                        active.setCoords();
                        fabricCanvas.current.requestRenderAll();
                      }
                    }}
                    className="h-10 rounded-lg bg-gray-100 border"
                  >
                    ➡
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-xl border border-red-200">
              <button
                onClick={() => {
                  if (active) {
                    const isLocked = !(active as any).isLocked;
                    (active as any).isLocked = isLocked;
                    setIsTextLocked(isLocked);
                  }
                }}
                className={`w-full h-10 rounded-lg font-bold ${isTextLocked ? 'bg-red-600 text-white' : 'bg-green-500 text-white'
                  }`}
              >
                {isTextLocked ? '🔒 Locked' : '🔓 Unlocked'}
              </button>
              <p className="text-xs text-center mt-2">{isTextLocked ? 'Users cannot edit' : 'Users can edit'}</p>
            </div>
            <details>
              <summary className='cursor-pointer text-blue-500'>Add Font</summary>
              <div className='flex flex-col gap-1 items-center'>
                <Input type="text" name="fontName" id="fontName" placeholder='Enter Font Name' onChange={(e) => { setFontName(e.target.value) }} />
                <Input type="text" name="fontCDN" id="fontCDN" placeholder='Enter CDN Link' onChange={(e) => { setCdnLink(e.target.value) }} />
                <Button className="w-20" type="submit" onClick={handleAddFont}>Add Font</Button>
              </div>
            </details>
            <button
              onClick={() => {
                fabricCanvas.current?.remove(active);
                fabricCanvas.current?.discardActiveObject();
                fabricCanvas.current?.requestRenderAll();
                setActive(null);
              }}
              className="w-full py-3 text-red-500 border rounded-xl hover:bg-red-50 font-bold"
            >
              Delete Layer
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-2xl p-6">
            <p className="text-sm">Select a layer to edit</p>
          </div>
        )}
      </div>
    </div >
  );
}
