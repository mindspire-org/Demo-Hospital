import { ensureUrduFontReady, hasUrduChars } from './renderUrduImage'

export async function ensureUrduNastaleeq(_doc: any): Promise<boolean> {
  // We no longer load the TTF into jsPDF (its parser cannot handle Urdu shaping).
  // Instead we render Urdu text to canvas images and embed them in the PDF.
  return ensureUrduFontReady()
}

export { hasUrduChars }
export { drawUrduText, renderUrduToImage } from './renderUrduImage'
