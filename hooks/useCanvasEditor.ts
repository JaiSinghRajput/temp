"use client";

import { useRef, useCallback, useEffect } from 'react';
import { Canvas, Textbox, FabricImage } from 'fabric';
import { TextElement } from '@/lib/types';

interface UseCanvasEditorOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  onTextChange?: (id: string, text: string) => void;
  onTextSelect?: (id: string | null) => void;
}

export function useCanvasEditor({ containerRef, onTextChange, onTextSelect }: UseCanvasEditorOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<Canvas | null>(null);
  const textObjects = useRef<Map<string, Textbox>>(new Map());
  const originalTextData = useRef<Map<string, { left: number; top: number; fontSize: number; width?: number; angle?: number }>>(new Map());
  const designSize = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const backgroundImageRef = useRef<FabricImage | null>(null);
  const resizeFrame = useRef<number | null>(null);

  const computeScale = useCallback(() => {
    const baseWidth = designSize.current.width || backgroundImageRef.current?.width || 1;
    const baseHeight = designSize.current.height || backgroundImageRef.current?.height || 1;
    const containerWidth = containerRef.current?.clientWidth || baseWidth;
    const containerHeight = containerRef.current?.clientHeight || baseHeight;
    const padding = 48;
    const availableW = Math.max(containerWidth - padding, 240);
    const availableH = Math.max(containerHeight - padding, 240);
    return Math.min(availableW / baseWidth, availableH / baseHeight, 1);
  }, [containerRef]);

  const applyScale = useCallback((scale: number) => {
    if (!fabricCanvas.current) return;
    const baseWidth = designSize.current.width || 1;
    const baseHeight = designSize.current.height || 1;

    fabricCanvas.current.setDimensions({
      width: baseWidth * scale,
      height: baseHeight * scale,
    });

    const bg = backgroundImageRef.current;
    if (bg) {
      bg.set({
        scaleX: scale,
        scaleY: scale,
        originX: 'left',
        originY: 'top',
        left: 0,
        top: 0,
      });
      fabricCanvas.current.backgroundImage = bg;
    }

    originalTextData.current.forEach((orig, id) => {
      const textbox = textObjects.current.get(id);
      if (!textbox) return;
      textbox.set({
        left: orig.left * scale,
        top: orig.top * scale,
        fontSize: orig.fontSize * scale,
        width: orig.width ? orig.width * scale : undefined,
        angle: orig.angle || 0,
      });
      textbox.setCoords();
    });

    fabricCanvas.current.requestRenderAll();
  }, []);

  const updateTextContent = useCallback((id: string, newText: string) => {
    const textbox = textObjects.current.get(id);
    if (textbox && fabricCanvas.current) {
      if ((textbox as any).isLocked) {
        return;
      }
      
      textbox.set('text', newText);
      fabricCanvas.current.requestRenderAll();
      onTextChange?.(id, newText);
    }
  }, [onTextChange]);

  const exportToDataURL = useCallback((multiplier = 2) => {
    if (!fabricCanvas.current) return '';
    return fabricCanvas.current.toDataURL({ format: 'png', multiplier });
  }, []);

  const dispose = useCallback(() => {
    if (resizeFrame.current) {
      cancelAnimationFrame(resizeFrame.current);
    }
    if (fabricCanvas.current) {
      fabricCanvas.current.dispose();
      fabricCanvas.current = null;
    }
    textObjects.current.clear();
    originalTextData.current.clear();
  }, []);

  return {
    canvasRef,
    fabricCanvas,
    textObjects,
    originalTextData,
    designSize,
    backgroundImageRef,
    resizeFrame,
    computeScale,
    applyScale,
    updateTextContent,
    exportToDataURL,
    dispose,
  };
}
