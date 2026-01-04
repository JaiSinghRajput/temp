import { Canvas, Textbox } from 'fabric';

export type AnimationType = 
  | 'fadeIn' 
  | 'slideInLeft' 
  | 'slideInRight' 
  | 'slideInTop' 
  | 'slideInBottom' 
  | 'scaleIn' 
  | 'rotateIn' 
  | 'typewriter' 
  | 'bounce' 
  | 'pulse';

export interface AnimationOptions {
  type: AnimationType;
  duration?: number; // milliseconds
  delay?: number;
  easing?: (t: number) => number; // 0 to 1 easing function
  onComplete?: () => void;
}

// Easing functions
const easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * (t - 2)) * (2 * (t - 2)) + 1,
};

export async function animateTextElement(
  canvas: Canvas,
  textbox: Textbox,
  options: AnimationOptions
): Promise<void> {
  const {
    type,
    duration = 1000,
    delay = 0,
    easing: easingFn = easing.easeOutCubic,
    onComplete,
  } = options;

  return new Promise((resolve) => {
    // Wait for delay
    setTimeout(() => {
      const startTime = Date.now();
      const initialState = captureTextState(textbox);

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easingFn(progress);

        applyAnimation(canvas, textbox, type, initialState, easedProgress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          canvas.requestRenderAll();
          onComplete?.();
          resolve();
        }
      };

      animate();
    }, delay);
  });
}

interface TextState {
  opacity: number;
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  originalText: string;
}

function captureTextState(textbox: Textbox): TextState {
  return {
    opacity: textbox.opacity || 1,
    left: textbox.left || 0,
    top: textbox.top || 0,
    scaleX: textbox.scaleX || 1,
    scaleY: textbox.scaleY || 1,
    angle: textbox.angle || 0,
    originalText: textbox.text || '',
  };
}

function applyAnimation(
  canvas: Canvas,
  textbox: Textbox,
  type: AnimationType,
  initial: TextState,
  progress: number
): void {
  const offset = 100; // offset for slide animations

  switch (type) {
    case 'fadeIn':
      textbox.opacity = initial.opacity * progress;
      break;

    case 'slideInLeft':
      textbox.left = initial.left - offset * (1 - progress);
      textbox.opacity = progress;
      break;

    case 'slideInRight':
      textbox.left = initial.left + offset * (1 - progress);
      textbox.opacity = progress;
      break;

    case 'slideInTop':
      textbox.top = initial.top - offset * (1 - progress);
      textbox.opacity = progress;
      break;

    case 'slideInBottom':
      textbox.top = initial.top + offset * (1 - progress);
      textbox.opacity = progress;
      break;

    case 'scaleIn':
      const scale = progress;
      textbox.scaleX = initial.scaleX * scale;
      textbox.scaleY = initial.scaleY * scale;
      textbox.opacity = progress;
      break;

    case 'rotateIn':
      textbox.angle = 360 * (1 - progress);
      textbox.opacity = progress;
      break;

    case 'bounce':
      const bounceProgress = progress * Math.PI;
      const bounce = Math.sin(bounceProgress) * (1 - progress) * 30;
      textbox.top = initial.top - bounce;
      textbox.opacity = progress;
      break;

    case 'pulse':
      const pulse = 1 + Math.sin(progress * Math.PI * 3) * 0.1;
      textbox.scaleX = initial.scaleX * pulse;
      textbox.scaleY = initial.scaleY * pulse;
      break;

    case 'typewriter':
      const totalChars = initial.originalText.length;
      const visibleChars = Math.floor(totalChars * progress);
      textbox.text = initial.originalText.substring(0, visibleChars);
      break;
  }

  canvas.requestRenderAll();
}

export async function animateMultipleTexts(
  canvas: Canvas,
  textboxes: Textbox[],
  animationOptions: AnimationOptions,
  staggerDelay: number = 100
): Promise<void> {
  const promises = textboxes.map((textbox, index) =>
    animateTextElement(canvas, textbox, {
      ...animationOptions,
      delay: (animationOptions.delay || 0) + index * staggerDelay,
    })
  );

  await Promise.all(promises);
}
