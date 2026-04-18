let urduNastaleeqB64: string | null = null

async function fetchBase64(url: string): Promise<string> {
  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const buf = await resp.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return btoa(binary)
  } catch (error) {
    console.warn('Failed to fetch Urdu font from URL:', url, error)
    throw error
  }
}

export async function ensureUrduNastaleeq(doc: any){
  // Expect this file to exist in the frontend build output.
  // Required path: src/assets/fonts/AlQalamTajNastaleeq.ttf
  const url = '/assets/fonts/AlQalamTajNastaleeq.ttf'

  try {
    if (!urduNastaleeqB64) {
      try {
        urduNastaleeqB64 = await fetchBase64(url)
      } catch {
        // Font not available, use fallback
        return
      }
    }
  } catch {
    return
  }
  
  try {
    // Suppress jsPDF internal errors by wrapping in try-catch
    const originalPubSub = (doc as any).internal?.events?.publish
    if (originalPubSub) {
      (doc as any).internal.events.publish = () => {}
    }
    doc.addFileToVFS('AlQalamTajNastaleeq.ttf', urduNastaleeqB64)
    doc.addFont('AlQalamTajNastaleeq.ttf', 'AlQalamTajNastaleeq', 'normal')
    // Restore pubsub
    if (originalPubSub) {
      (doc as any).internal.events.publish = originalPubSub
    }
  } catch {
    // Ignore font registration errors
  }
}
