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
  const router = useRouter();

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
      const result = await uploadToCloudinary(file);
      setTemplateImageUrl(result.secureUrl);
      setCloudinaryPublicId(result.publicId);

      if (fabricCanvas.current && containerRef.current) {
        await loadCanvasBackgroundImage({
          canvas: fabricCanvas.current,
          imageUrl: result.secureUrl,
          containerWidth: containerRef.current.clientWidth,
          containerHeight: containerRef.current.clientHeight,
          isCancelled: () => isCanvasDisposed.current,
          onSuccess: () => setIsUploadingImage(false),
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
      // Get all text objects from canvas
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

      // Generate and upload final canvas thumbnail to Cloudinary
      const thumbnailDataURL = fabricCanvas.current.toDataURL({ format: 'png', multiplier: 0.3 });
      const thumbUpload = await uploadDataUrlToCloudinary(thumbnailDataURL, 'template-thumbnail.png');

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
          canvas_data: {
            textElements,
            canvasWidth: fabricCanvas.current.width,
            canvasHeight: fabricCanvas.current.height,
            customFonts: loadedCustomFonts,
          },
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
            className="text-sm text-gray-600 hover:text-gray-900"
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
          
          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-purple-700">Template Background Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="w-full h-10 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
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
          <button
            onClick={saveTemplate}
            disabled={isSaving || !templateName.trim()}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-bold transition shadow-md flex items-center justify-center gap-2"
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
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all transform active:scale-95"
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

              <div className="grid grid-cols-3 gap-4">
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
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Style</label>
                  <button
                    onClick={toggleBold}
                    className={`w-full h-10 rounded-lg text-sm font-bold transition ${
                      bold
                        ? 'bg-gray-800 hover:bg-gray-900 text-white'
                        : 'bg-gray-50 hover:bg-gray-100 border text-gray-700'
                    }`}
                  >
                    B
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Presets</label>
                <select
                  className="w-full p-2 border rounded-lg mt-1 bg-white outline-none"
                  value={fontFamily}
                  onChange={(e) => handleAttributeChange('fontFamily', e.target.value)}
                >
                  {PRESET_FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                </select>
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
                className={`w-full h-10 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${
                  isTextLocked
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

            {/* Custom Font Section */}
            <div className="bg-indigo-50 p-5 rounded-2xl space-y-3 border border-indigo-100">
              <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Custom Google Font</label>
              <input
                type="text"
                placeholder="Google Font URL..."
                className="w-full p-2 text-xs border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
                value={customFontUrl}
                onChange={(e) => setCustomFontUrl(e.target.value)}
              />
              <input
                type="text"
                placeholder="Font Name"
                className="w-full p-2 text-xs border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
                value={customFontName}
                onChange={(e) => setCustomFontName(e.target.value)}
              />
              <button
                onClick={handleApplyCustomFont}
                disabled={!customFontUrl || !customFontName || isLoadingFont}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg text-xs font-bold transition shadow-md flex items-center justify-center gap-2"
              >
                {isLoadingFont ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Applying...
                  </>
                ) : (
                  'Apply Custom Font'
                )}
              </button>
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