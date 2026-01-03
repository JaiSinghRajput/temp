'use client';
import { useEffect, useRef, useState } from 'react';
import { Canvas, Textbox } from 'fabric';
import { TextElement } from '@/lib/types';
import {
  loadTextOnlyCanvas,
  getUpdatedTextContent,
  loadCustomFonts,
} from '@/lib/text-only-canvas-renderer';

interface PublishPayload {
  customizedData: any;
  previewDataUrl?: string;
}

interface TextEditorProps {
  templateId: number;
  canvasData: any;
  backgroundUrl?: string;
  backgroundId?: number;
  onPublish?: (payload: PublishPayload) => void;
  isLoading?: boolean;
}

export default function TextEditor({
  templateId,
  canvasData,
  backgroundUrl,
  backgroundId,
  onPublish,
  isLoading = false,
}: TextEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const textObjectsRef = useRef<Map<string, Textbox>>(new Map());

  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [canvasScale, setCanvasScale] = useState(0.5);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileEditor, setShowMobileEditor] = useState(false);

  // Get text elements from canvas data
  const textElements: TextElement[] = canvasData?.textElements || [];
  const canvasWidth = canvasData?.canvasWidth || 800;
  const canvasHeight = canvasData?.canvasHeight || 600;

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) {
      console.log('Canvas refs not ready');
      return;
    }

    if (!backgroundUrl && !backgroundId) {
      console.error('No background URL or ID provided');
      setError('Template missing background image');
      return;
    }

    console.log('Initializing canvas with:', { backgroundUrl, backgroundId, textElements: textElements.length });

    const container = containerRef.current;
    const width = Math.min(container.offsetWidth, 420);
    const height = (width / canvasWidth) * canvasHeight;
    const scale = width / canvasWidth;

    canvasRef.current.width = width;
    canvasRef.current.height = height;

    const canvas = new Canvas(canvasRef.current, {
      width,
      height,
      selection: false,
    });

    fabricCanvasRef.current = canvas;

    // Load canvas with text elements
    loadTextOnlyCanvas({
      canvas,
      imageUrl: backgroundUrl,
      backgroundId,
      textElements,
      canvasWidth,
      canvasHeight,
      scale,
      onTextSelect: (id) => {
        setSelectedTextId(id);
        const textbox = textObjectsRef.current.get(id);
        if (textbox) {
          setSelectedText(textbox.text || '');
        }
        if (isMobile) {
          setShowMobileEditor(true);
        }
      },
      customFonts: canvasData?.customFonts,
    })
      .then(({ textObjects }) => {
        console.log('Canvas loaded successfully with', textObjects.size, 'text objects');
        textObjectsRef.current = textObjects;
        setCanvasScale(scale);
      })
      .catch((err) => {
        console.error('Error loading canvas:', err);
        setError(`Failed to load canvas: ${err.message}`);
      });

    return () => {
      canvas.dispose();
    };
  }, [canvasData, backgroundUrl, backgroundId, canvasWidth, canvasHeight, isMobile]);

  // Track viewport for mobile handling
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    handler(mq);
    mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  }, []);

  // Update text when editing
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setSelectedText(newText);

    if (selectedTextId && fabricCanvasRef.current) {
      const textbox = textObjectsRef.current.get(selectedTextId);
      if (textbox) {
        textbox.set({ text: newText });
        fabricCanvasRef.current.renderAll();
      }
    }
  };

  // Handle publish
  const handlePublish = async () => {
    if (!fabricCanvasRef.current) return;

    try {
      setIsSaving(true);
      setError('');

      // Get updated text content
      const updatedTexts = getUpdatedTextContent(textObjectsRef.current);

      // Create customized data with updated texts
      const customizedData = {
        ...canvasData,
        textElements: textElements.map((el) => ({
          ...el,
          text: updatedTexts.find((ut) => ut.id === el.id)?.text || el.text,
        })),
      };

      // Export a sharp preview at original or higher resolution to avoid blur
      const multiplier = Math.max(2, 1 / canvasScale || 1); // upscale relative to display scale
      const previewDataUrl = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier,
      });

      if (onPublish) {
        await onPublish({ customizedData, previewDataUrl });
      }
    } catch (err) {
      console.error('Error publishing card:', err);
      setError('Failed to publish card');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTextElement = textElements.find((el) => el.id === selectedTextId);

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-8">
      {/* Canvas Preview */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {error ? (
            <div className="h-96 flex items-center justify-center bg-red-50 border border-red-200">
              <div className="text-center">
                <p className="text-red-700 font-semibold mb-2">Error Loading Canvas</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <div ref={containerRef} className="flex items-center justify-center bg-gray-50 p-6 min-h-100">
              <canvas
                ref={canvasRef}
                className="border-2 border-gray-300 rounded-lg shadow-sm cursor-text"
              />
            </div>
          )}
        </div>
      </div>

      {/* Text Editor Sidebar (desktop) */}
      <div className="lg:col-span-1 hidden lg:block">
        <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Edit Text</h3>

          {selectedTextId && selectedTextElement ? (
            <div className="space-y-4">
              {/* Field Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field
                </label>
                <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  {selectedTextElement.label || 'Text Field'}
                </p>
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  value={selectedText}
                  onChange={handleTextChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={6}
                  placeholder="Enter text here..."
                />
              </div>

              {/* Text Properties (Read-only) */}
              <div className="bg-[#f3e4d6] border border-[#e4cdb4] rounded-lg p-4">
                <p className="text-xs font-semibold text-[#b87435] mb-3">Locked Properties</p>
                <div className="space-y-2 text-xs text-[#8a5a24]">
                  <div className="flex justify-between">
                    <span>Font:</span>
                    <span className="font-medium">
                      {selectedTextElement.fontFamily || 'Arial'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-medium">{selectedTextElement.fontSize}px</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Color:</span>
                    <span
                      className="w-6 h-6 rounded border border-blue-300"
                      style={{ backgroundColor: selectedTextElement.fill || '#000000' }}
                    ></span>
                  </div>
                  <p className="text-xs italic text-[#b87435] mt-2">
                    ℹ️ You can only modify the text content. Position, size, and styling are locked.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                Click on any text in the card to edit it
              </p>
            </div>
          )}

          {/* Publish Button */}
          <div className="mt-6">
            <button
              onClick={handlePublish}
              disabled={isSaving || isLoading}
              className="w-full px-4 py-3 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(90deg, #d18b47, #b87435)' }}
            >
              {isSaving || isLoading ? 'Publishing...' : 'Publish Card'}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Mobile editor modal */}
    {isMobile && showMobileEditor && selectedTextElement && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 animate-fade-in-up">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Editing</p>
              <h3 className="text-lg font-semibold text-gray-900">{selectedTextElement?.label || 'Text Field'}</h3>
            </div>
            <button
              onClick={() => setShowMobileEditor(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <textarea
              value={selectedText}
              onChange={handleTextChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d18b47] resize-none"
              rows={5}
              placeholder="Enter text here..."
            />

            <div className="bg-[#f3e4d6] border border-[#e4cdb4] rounded-lg p-4 text-xs text-[#8a5a24]">
              <p className="font-semibold text-[#b87435] mb-3">Locked Properties</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Font:</span>
                  <span className="font-medium">{selectedTextElement?.fontFamily || 'Arial'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span className="font-medium">{selectedTextElement?.fontSize}px</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Color:</span>
                  <span
                    className="w-6 h-6 rounded border border-[#e4cdb4]"
                    style={{ backgroundColor: selectedTextElement?.fill || '#000000' }}
                  ></span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMobileEditor(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowMobileEditor(false);
                  handlePublish();
                }}
                disabled={isSaving || isLoading}
                className="flex-1 px-4 py-2 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(90deg, #d18b47, #b87435)' }}
              >
                {isSaving || isLoading ? 'Publishing...' : 'Save & Publish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
