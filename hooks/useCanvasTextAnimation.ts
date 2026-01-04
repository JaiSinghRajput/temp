import { useEffect, useRef } from 'react';
import { Canvas, Textbox } from 'fabric';
import { animateTextElement, animateMultipleTexts, AnimationType, AnimationOptions } from '@/lib/canvas-text-animations';

export function useCanvasTextAnimation() {
  const canvasRef = useRef<Canvas | null>(null);

  const animateSingleText = async (
    textbox: Textbox,
    animationType: AnimationType,
    duration: number = 1000,
    delay: number = 0
  ) => {
    if (!canvasRef.current) return;

    await animateTextElement(canvasRef.current, textbox, {
      type: animationType,
      duration,
      delay,
    });
  };

  const animateAllTexts = async (
    textboxes: Textbox[],
    animationType: AnimationType,
    duration: number = 1000,
    staggerDelay: number = 100
  ) => {
    if (!canvasRef.current) return;

    await animateMultipleTexts(canvasRef.current, textboxes, {
      type: animationType,
      duration,
    }, staggerDelay);
  };

  const setCanvas = (canvas: Canvas) => {
    canvasRef.current = canvas;
  };

  return {
    setCanvas,
    animateSingleText,
    animateAllTexts,
  };
}
