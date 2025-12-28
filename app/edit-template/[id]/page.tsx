'use client';
import { useEffect, useRef, useState, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Canvas, Textbox, FabricImage } from 'fabric';

interface TextElement {
  id: string;
  text: string;
  label: string;
}

interface TemplateData {
  id: number;
  name: string;
  description: string;
  template_image_url: string;
  canvas_data: {
    textElements: Array<{
      id: string;
      text: string;
      label: string;
      left: number;
      top: number;
      fontSize: number;
      fontFamily: string;
      fill: string;
      width?: number;
      textAlign?: string;
      angle?: number;
    }>;
    canvasWidth: number;
    canvasHeight: number;
    customFonts?: Array<{ name: string; url: string }>;
  };
}

export default function EditTemplate({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textObjects = useRef<Map<string, Textbox>>(new Map());
  const router = useRouter();

  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch template from database
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const templateId = unwrappedParams.id;
        const response = await fetch(`/api/templates/${templateId}`);
        const result = await response.json();
        
        if (result.success) {
          setTemplateData(result.data);
        } else {
          setError('Template not found');
        }
      } catch (err) {
        console.error('Error fetching template:', err);
        setError('Failed to load template');
      } finally {
        setLoading(false);
      }
    };

    if (unwrappedParams.id) {
      fetchTemplate();
    } else {
      setError('No template ID provided');
      setLoading(false);
    }
  }, [unwrappedParams.id]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !templateData) return;

    // Dispose existing canvas if any
    if (fabricCanvas.current) {
      fabricCanvas.current.dispose();
      fabricCanvas.current = null;
    }

    // Load custom fonts if any
    const loadCustomFonts = async () => {
      if (templateData.canvas_data.customFonts) {
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
        backgroundColor: '#ffffff',
        selection: false, // Disable selection on canvas
      });
      fabricCanvas.current = canvas;

      const containerWidth = containerRef.current!.clientWidth;
      const containerHeight = containerRef.current!.clientHeight;

      // Load template image from database
      FabricImage.fromURL(templateData.template_image_url, {
        crossOrigin: 'anonymous'
      }).then((img) => {
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

        // Load text elements AFTER image is loaded
        const canvasData = templateData.canvas_data;
        if (canvasData && canvasData.textElements) {
          const elements: TextElement[] = [];

          canvasData.textElements.forEach((data) => {
            const textbox = new Textbox(data.text, {
              left: data.left,
              top: data.top,
              fontSize: data.fontSize,
              fontFamily: data.fontFamily,
              fill: data.fill,
              width: data.width,
              textAlign: data.textAlign as any,
              angle: data.angle || 0,
              // Lock all transformations - users can't move, scale, or rotate
              lockMovementX: true,
              lockMovementY: true,
              lockScalingX: true,
              lockScalingY: true,
              lockRotation: true,
              hasControls: false, // Remove corner controls
              hasBorders: false, // Remove selection borders
              selectable: false, // Make non-selectable on canvas
              editable: false, // Prevent direct editing on canvas
              hoverCursor: 'default',
            });

            // Store locked status on textbox
            (textbox as any).isLocked = data.locked || false;

            canvas.add(textbox);
            textObjects.current.set(data.id, textbox);

            elements.push({
              id: data.id,
              text: data.text,
              label: data.label,
            });
          });

          setTextElements(elements);
        }

        canvas.requestRenderAll();
        setLoading(false);
      }).catch((err) => {
        console.error('Failed to load image:', err);
        setError('Failed to load template image');
        setLoading(false);
      });
    });

    return () => {
      if (fabricCanvas.current) {
        fabricCanvas.current.dispose();
        fabricCanvas.current = null;
      }
    };
  }, [templateData]);

  const handleTextChange = (id: string, newText: string) => {
    const textbox = textObjects.current.get(id);
    if (textbox && fabricCanvas.current) {
      // Check if field is locked
      if ((textbox as any).isLocked) {
        return;
      }
      
      textbox.set('text', newText);
      fabricCanvas.current.requestRenderAll();

      // Update state
      setTextElements(prev =>
        prev.map(el => el.id === id ? { ...el, text: newText } : el)
      );
    }
  };

  const downloadImage = () => {
    if (!fabricCanvas.current) return;
    const dataURL = fabricCanvas.current.toDataURL({ format: 'png', multiplier: 2 });
    const link = document.createElement('a');
    link.download = 'my-ecard.png';
    link.href = dataURL;
    link.click();
  };

  const resetToDefault = () => {
    if (!templateData) return;
    
    // Reset all text to original template values
    templateData.canvas_data.textElements.forEach((data) => {
      handleTextChange(data.id, data.text);
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center bg-white p-10 rounded-2xl shadow-2xl max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/templates')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition"
          >
            Back to Templates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
      {/* Canvas Area */}
      <div ref={containerRef} className="flex-1 p-8 flex justify-center items-center bg-gradient-to-br from-blue-50 to-purple-50 overflow-auto">
        {loading ? (
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading template...</p>
          </div>
        ) : (
          <div className="shadow-2xl rounded-lg overflow-hidden border border-gray-200 bg-white">
            <canvas ref={canvasRef} />
          </div>
        )}
      </div>

      {/* Sidebar - Text Editing Only */}
      <div className="w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col p-6 gap-6 overflow-y-auto">
        <div className="border-b pb-4">
          <button
            onClick={() => router.push('/templates')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-3 flex items-center gap-1"
          >
            ← Back to Templates
          </button>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {templateData?.name || 'Customize Your E-Card'}
          </h1>
          <p className="text-sm text-gray-500">
            {templateData?.description || 'Edit the text fields below to personalize your card'}
          </p>
        </div>

        {!loading ? (() => {
          const visible = textElements.filter((element) => {
            const textbox = textObjects.current.get(element.id);
            const isLocked = (textbox as any)?.isLocked || false;
            return !isLocked;
          });

          if (visible.length === 0) {
            return (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm text-center px-4">
                All fields are locked for this template.
              </div>
            );
          }

          return (
            <div className="space-y-4 flex-1">
              {visible.map((element) => (
                <div key={element.id} className="p-4 rounded-xl border bg-gray-50 border-gray-200">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 block flex items-center justify-between">
                    <span>{element.label}</span>
                  </label>
                  <textarea
                    className="w-full p-3 border rounded-lg bg-white outline-none text-sm resize-none transition border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    value={element.text}
                    onChange={(e) => handleTextChange(element.id, e.target.value)}
                    placeholder={`Enter ${element.label.toLowerCase()}...`}
                  />
                </div>
              ))}
            </div>
          );
        })() : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Loading...
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 border-t pt-4">
          <button
            onClick={downloadImage}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all transform active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Download E-Card
          </button>
          <button
            onClick={resetToDefault}
            disabled={loading}
            className="w-full py-3 text-gray-700 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset to Default
          </button>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Note</h3>
          <p className="text-xs text-blue-700 leading-relaxed">
            You can only edit the text content. The position, font style, size, and colors are set by the template designer.
          </p>
        </div>
      </div>
    </div>
  );
}