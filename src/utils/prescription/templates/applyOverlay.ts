import type { PrescriptionOverlaySettings } from '../../prescriptionPdf'

export async function applyOverlayBeforeOutput(pdf: any) {
  const overlay: PrescriptionOverlaySettings | undefined = (window as any).__rxOverlaySettings
  if (!overlay) return
  if (!overlay.headerImageDataUrl && !overlay.footerImageDataUrl && !overlay.watermark) return

  const { applyPrescriptionOverlays } = await import('../../prescriptionPdf')
  await applyPrescriptionOverlays(pdf, overlay)
}
