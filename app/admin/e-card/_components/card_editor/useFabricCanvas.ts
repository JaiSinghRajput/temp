import { useEffect, useRef } from 'react';
import { Canvas, Textbox } from 'fabric';

export function useFabricCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement>
) {
  const fabricCanvas = useRef<Canvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      backgroundColor: '#ffffff',
    });

    fabricCanvas.current = canvas;

    return () => {
      canvas.dispose();
      fabricCanvas.current = null;
    };
  }, [canvasRef]);

  const getTextElements = () => {
    if (!fabricCanvas.current) return [];

    return fabricCanvas.current
      .getObjects()
      .filter(o => o instanceof Textbox)
      .map((obj, i) => {
        const t = obj as Textbox;
        return {
          id: String(i + 1),
          text: t.text || '',
          label: `Text Field ${i + 1}`,
          left: t.left!,
          top: t.top!,
          fontSize: t.fontSize!,
          fontFamily: t.fontFamily!,
          fontWeight: t.fontWeight,
          fill: t.fill as string,
          width: t.width,
          textAlign: t.textAlign,
          angle: t.angle || 0,
          locked: (t as any).isLocked || false,
        };
      });
  };

  return {
    fabricCanvas,
    getTextElements,
  };
}
