export interface CustomFont {
  name: string;
  url: string;
}

/**
 * Load custom  Font into the document
 */
export async function loadCustomFont(font: CustomFont): Promise<void> {
  const id = `font-${font.name.replace(/\s+/g, '-').toLowerCase()}`;
  
  // Check if already loaded
  if (document.getElementById(id)) {
    return;
  }
  // Inject stylesheet
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = font.url;
  document.head.appendChild(link);

  try {
    await document.fonts.load(`16px "${font.name}"`);
    await document.fonts.ready;
  } catch (err) {
    console.error(`Failed to load font ${font.name}:`, err);
    throw err;
  }
}

/**
 * Load multiple custom fonts
 */
export async function loadCustomFonts(fonts: CustomFont[]): Promise<void> {
  for (const font of fonts) {
    await loadCustomFont(font);
  }
}
