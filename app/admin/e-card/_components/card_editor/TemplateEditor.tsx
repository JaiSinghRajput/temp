'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, Textbox } from 'fabric';
import { loadCustomFonts } from '@/lib/canvas-renderer';
import { uploadDataUrlToCloudinary, uploadToCloudinary } from '@/lib/cloudinary';
import { loadCanvasBackgroundImage, validateImageFile } from '@/lib/canvas-utils';
import { COLOR_OPTIONS } from '@/lib/constants';
import { ColorSelect } from '@/components/ui/color-select';
import type { Category, Subcategory, CustomFont } from '@/lib/types';

const DEFAULT_TEMPLATE_IMAGE = '';

type EditorMode = 'create' | 'edit';

interface TemplateEditorProps {
  mode: EditorMode;
  initialData?: any | null;
  templateId?: string;
  onSave?: (payload: any) => Promise<void>;
  onCancel?: () => void;
}

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

  /* ---------------- UI STATE ---------------- */
  const [active, setActive] = useState<Textbox | null>(null);
  const [textValue, setTextValue] = useState('');
  const [fontSize, setFontSize] = useState(40);
  const [bold, setBold] = useState(false);
  const [fillColor, setFillColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [isTextLocked, setIsTextLocked] = useState(false);

  /* ---------------- FONT STATE ---------------- */
  const [fontSearchQuery, setFontSearchQuery] = useState('');
  const [showFontSuggestions, setShowFontSuggestions] = useState(false);
  const [loadedCustomFonts, setLoadedCustomFonts] = useState<CustomFont[]>([]);
  const [managedFonts, setManagedFonts] = useState<CustomFont[]>([]);

  /* ---------------- TEMPLATE STATE ---------------- */
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [categoryId, setCategoryId] = useState(1);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const [pricingType, setPricingType] = useState<'free' | 'premium'>('free');
  const [price, setPrice] = useState('');
  const [cardColor, setCardColor] = useState(COLOR_OPTIONS[0].value);

  const [pages, setPages] = useState<Array<{ imageUrl: string; publicId: string; canvasData?: any }>>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const isMultipage = pages.length > 1;

  const [templateImageUrl, setTemplateImageUrl] = useState(DEFAULT_TEMPLATE_IMAGE);
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState<string | null>(null);
  const [backgroundId, setBackgroundId] = useState<number | null>(null);

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewPublicId, setPreviewPublicId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingPreview, setIsUploadingPreview] = useState(false);
  
  // Loading states - always wait for fonts to load first
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(mode === 'edit');
  const [isFontsLoading, setIsFontsLoading] = useState(true);
  const [isContentReady, setIsContentReady] = useState(false);


  /* ---------------- LOAD MANAGED FONTS ---------------- */
  useEffect(() => {
    let cancelled = false;

    const loadManagedFonts = async () => {
      try {
        const res = await fetch('/api/font-cdn-links');
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) return;
        const fonts: CustomFont[] = json.data.map((f: any) => ({ name: f.font_name, url: f.cdn_link }));

        // Preload all fonts from CDN upfront
        await loadCustomFonts(fonts);

        if (!cancelled) {
          setManagedFonts(fonts);
          setLoadedCustomFonts(fonts); // Set all managed fonts as loaded
          setIsFontsLoading(false); // Mark fonts as loaded
        }
      } catch (err) {
        if (!cancelled) {
          setIsFontsLoading(false); // Mark as done even on error
        }
      }
    };

    loadManagedFonts();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- LOAD CATEGORIES ---------------- */
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        if (json.success) setCategories(json.data);
      } catch (e) {
      }
    };
    loadCategories();
  }, []);

  /* ---------------- LOAD SUBCATEGORIES ---------------- */
  useEffect(() => {
    const loadSubcategories = async () => {
      try {
        setSubcategoryId(null);
        const res = await fetch(`/api/subcategories?category_id=${categoryId}`);
        const json = await res.json();
        if (json.success) setSubcategories(json.data);
      } catch (e) {
      }
    };
    if (categoryId) loadSubcategories();
  }, [categoryId]);

  /* ---------------- INIT FROM EDIT DATA ---------------- */
  useEffect(() => {
    if (mode !== 'edit' || !initialData) return;

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

    // Ensure we have a valid image URL before setting it
    let imageUrl = initialData.template_image_url;
    
    if (initialData.is_multipage && initialData.pages?.length) {
      const normalizedPages = initialData.pages.map((p: any) => ({
        imageUrl: p.image_url || p.imageUrl,
        publicId: (p.cloudinary_public_id || p.cloudinaryPublicId) ?? null,
        canvasData: {
          textElements: p.canvas_data?.textElements || p.canvasData?.textElements || [],
          canvasWidth: p.canvas_data?.canvasWidth || p.canvasData?.canvasWidth,
          canvasHeight: p.canvas_data?.canvasHeight || p.canvasData?.canvasHeight,
        },
      }));
      setPages(normalizedPages);
      imageUrl = normalizedPages[0]?.imageUrl || imageUrl;
    }

    // Validate and set image URL
    if (imageUrl && imageUrl !== DEFAULT_TEMPLATE_IMAGE) {
      setTemplateImageUrl(imageUrl);
      setCloudinaryPublicId(initialData.cloudinary_public_id || null);
      setIsBackgroundLoading(true);
    } else {
      setIsBackgroundLoading(false);
    }
  }, [mode, initialData]);

  /* ---------------- CANVAS INIT ---------------- */
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

    canvas.on('selection:created', syncSidebar);
    canvas.on('selection:updated', syncSidebar);
    canvas.on('selection:cleared', () => setActive(null));
    canvas.on('text:changed', (e) => {
      if (e.target instanceof Textbox) setTextValue(e.target.text || '');
    });

    return () => {
      isCanvasDisposed.current = true;
      canvas.dispose();
      fabricCanvas.current = null;
    };
  }, []);

  /* ---------------- LOAD BACKGROUND ---------------- */
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
            // Don't set isContentReady here - wait for the coordinating effect
          },
          onError: () => {
            setIsBackgroundLoading(false);
            if (templateImageUrl !== DEFAULT_TEMPLATE_IMAGE) {
              alert('Failed to load background image. Using default.');
            }
            // Don't set isContentReady here - wait for the coordinating effect
          },
        });
      } catch (err) {
        setIsBackgroundLoading(false);
        // Don't set isContentReady here - wait for the coordinating effect
      }
    };

    loadBackground();
  }, [templateImageUrl]);

  /* ---------------- COORDINATE CONTENT READY STATE ---------------- */
  useEffect(() => {
    // Only set content ready when both fonts and background are loaded
    if (!isFontsLoading && !isBackgroundLoading) {
      setIsContentReady(true);
    }
  }, [isFontsLoading, isBackgroundLoading]);

  /* ---------------- LOAD INITIAL TEXT (EDIT MODE) ---------------- */
  useEffect(() => {
    if (!fabricCanvas.current || mode !== 'edit' || !initialData) return;
    
    // Don't load text until fonts are loaded
    if (isFontsLoading) {
      return;
    }

    const textElements = initialData.canvas_data?.textElements || [];
    if (textElements.length === 0) return;

    const loadTextElements = async () => {
      // Collect all unique fonts from text elements
      const uniqueFonts = Array.from(new Set(textElements.map((t: any) => t.fontFamily).filter(Boolean)));
      const fontsToLoad: CustomFont[] = [];
      
      // First try to find fonts in managedFonts, then in loadedCustomFonts
      for (const fontName of uniqueFonts) {
        const fontDef = managedFonts.find((f) => f.name === fontName) || loadedCustomFonts.find((f) => f.name === fontName);
        if (fontDef) {
          fontsToLoad.push(fontDef);
        }
      }

      // Also check if canvas_data has customFonts array
      const canvasCustomFonts = initialData.canvas_data?.customFonts || [];
      if (Array.isArray(canvasCustomFonts) && canvasCustomFonts.length > 0) {
        for (const font of canvasCustomFonts) {
          // Check if already in fontsToLoad
          if (!fontsToLoad.some((f) => f.name === font.name)) {
            fontsToLoad.push(font);
          }
        }
      }

      // Load fonts from CDN and wait for them to be ready
      if (fontsToLoad.length > 0) {
        try {
          await loadCustomFonts(fontsToLoad);
          
          // Wait for all fonts to be loaded in document
          const fontLoadPromises = fontsToLoad.map((font) =>
            document.fonts.load(`16px "${font.name}"`)
          );
          await Promise.all(fontLoadPromises);
          
          // Extra wait for document.fonts.ready
          await document.fonts.ready;
        } catch (err) {
        }
      }

      // Now create textboxes with loaded fonts
      textElements.forEach((textData: any) => {
        const tb = new Textbox(textData.text || '', {
          left: textData.left,
          top: textData.top,
          fontSize: textData.fontSize,
          fontFamily: textData.fontFamily,
          fontWeight: textData.fontWeight || 'normal',
          fill: textData.fill,
          width: textData.width,
          textAlign: textData.textAlign,
          angle: textData.angle || 0,
          originX: 'center',
          originY: 'center',
          cornerStyle: 'circle',
          cornerColor: '#3b82f6',
        });
        (tb as any).isLocked = Boolean(textData.locked);
        fabricCanvas.current?.add(tb);
      });

      fabricCanvas.current?.requestRenderAll();
      // Don't set isContentReady here - the coordinating effect will handle it
    };

    loadTextElements().catch((err) => {
      console.error('Error loading text elements:', err);
      // Don't set isContentReady here - the coordinating effect will handle it
    });
  }, [initialData, mode, managedFonts, loadedCustomFonts, isFontsLoading]);

  /* ---------------- HANDLERS ---------------- */
  const handleAttributeChange = async (key: string, value: any) => {
    if (!fabricCanvas.current) return;
    const target = fabricCanvas.current.getActiveObject?.() as Textbox | null;
    if (!target) return;

    if (key === 'fontFamily') {
      const fontDef = managedFonts.find((f) => f.name === value) || loadedCustomFonts.find((f) => f.name === value);
      if (!fontDef) {
        alert('This font is not available in the database.');
        return;
      }
      
      try {
        // Load the font from CDN
        await loadCustomFonts([fontDef]);
        
        // Wait for font to be ready in document
        await document.fonts.load(`${target.fontSize || 40}px "${value}"`);
        await document.fonts.ready;
        
        // Apply the font to the target
        target.set({ 
          fontFamily: value, 
          dirty: true, 
          objectCaching: false 
        } as any);
        
        setFontFamily(value);
        
        // Force complete re-render cycle
        (target as any)._clearCache?.();
        target.initDimensions();
        target.setCoords();
        
        // Re-render canvas multiple times to ensure font is applied
        fabricCanvas.current.requestRenderAll();
        
        // Additional render after a short delay for CDN fonts
        setTimeout(() => {
          if (fabricCanvas.current && !isCanvasDisposed.current) {
            (target as any)._clearCache?.();
            target.initDimensions();
            target.setCoords();
            fabricCanvas.current.requestRenderAll();
          }
        }, 150);
        
        // Update state to trigger re-render
        setActive(target);
        
        return; // Exit early for font changes
      } catch (err) {
        alert('Failed to load font. Please try again.');
        return;
      }
    }

    // For non-font changes
    target.set({ [key]: value, dirty: true, objectCaching: false } as any);
    if (key === 'text') setTextValue(value);
    if (key === 'fontSize') setFontSize(value);
    if (key === 'fill') setFillColor(value);
    if (key === 'fontWeight') setBold(value === 'bold');
    
    // Clear cache and update dimensions
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
        const objects = fabricCanvas.current?.getObjects() || [];
        const textElements = objects.filter((obj) => obj instanceof Textbox).map((obj, i) => {
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

  const buildCurrentPageSnapshot = () => {
    if (!fabricCanvas.current || !cloudinaryPublicId) return null;

    const objects = fabricCanvas.current.getObjects();
    const textElements = objects.filter((obj) => obj instanceof Textbox).map((obj, i) => {
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

    if (pages[currentPageIndex]) {
      const objects = fabricCanvas.current.getObjects();
      const textElements = objects.filter((obj) => obj instanceof Textbox).map((obj, i) => {
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
                cornerColor: '#3b82f6',
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
      const textElements = objects.filter((o) => o instanceof Textbox).map((obj, i) => {
        const t = obj as Textbox;
        return {
          id: String(i + 1),
          text: t.text,
          label: `Text Field ${i + 1}`,
          left: t.left,
          top: t.top,
          fontSize: t.fontSize,
          fontWeight: t.fontWeight,
          fontFamily: t.fontFamily,
          fill: t.fill,
          width: t.width,
          textAlign: t.textAlign,
          angle: t.angle || 0,
          locked: (t as any).isLocked || false,
        };
      });

      if (isMultipage && pages[currentPageIndex]) {
        pages[currentPageIndex].canvasData = {
          textElements,
          canvasWidth: fabricCanvas.current.width,
          canvasHeight: fabricCanvas.current.height,
        };
      }

      let thumbSecureUrl = previewImageUrl;
      let thumbPublicId = previewPublicId;

      if (!thumbSecureUrl) {
        const thumbnailDataURL = fabricCanvas.current.toDataURL({ format: 'png', multiplier: 0.3 });
        const thumbUpload = await uploadDataUrlToCloudinary(thumbnailDataURL, 'template-thumbnail.png');
        thumbSecureUrl = thumbUpload.secureUrl;
        thumbPublicId = thumbUpload.publicId;
      }

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

      const payload = {
        name: templateName,
        description: templateDescription,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        color: cardColor || null,
        pricing_type: pricingType,
        price: pricingType === 'premium' ? Number(price) : 0,
        is_multipage: isMultipage,
        template_image_url: isMultipage && pages.length > 0 ? pages[0].imageUrl : templateImageUrl,
        cloudinary_public_id: cloudinaryPublicId,
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
              options={COLOR_OPTIONS}
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
              <div className="relative h-32 bg-gray-50 border rounded-lg overflow-hidden">
                <img src={previewImageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {pages.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <label className="text-xs font-semibold text-purple-700">Pages ({pages.length})</label>
              <div className="space-y-1 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded-lg">
                {pages.map((page, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded ${
                      currentPageIndex === idx
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
                  <div className="text-xs text-center mt-1">{fontSize}px</div>
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
                    className={`w-full h-10 rounded-lg font-bold ${
                      bold ? 'bg-gray-900 text-white' : 'bg-gray-100 border'
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
                className={`w-full h-10 rounded-lg font-bold ${
                  isTextLocked ? 'bg-red-600 text-white' : 'bg-green-500 text-white'
                }`}
              >
                {isTextLocked ? '🔒 Locked' : '🔓 Unlocked'}
              </button>
              <p className="text-xs text-center mt-2">{isTextLocked ? 'Users cannot edit' : 'Users can edit'}</p>
            </div>

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
    </div>
  );
}
