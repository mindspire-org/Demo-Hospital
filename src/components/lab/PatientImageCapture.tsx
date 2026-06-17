import { useRef, useState, useCallback } from 'react'
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react'

type Props = {
  value: string | null
  onChange: (dataUrl: string | null) => void
  className?: string
}

export default function PatientImageCapture({ value, onChange, className = '' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      setStream(null)
    }
    setCameraOpen(false)
  }, [stream])

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } })
      setStream(s)
      setCameraOpen(true)
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s }, 50)
    } catch {
      alert('Camera access denied or unavailable')
    }
  }, [])

  const capture = useCallback(() => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(videoRef.current, 0, 0, 320, 240)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    onChange(dataUrl)
    stopCamera()
  }, [onChange, stopCamera])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxW = 320
        const scale = maxW / img.width
        canvas.width = maxW
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          onChange(canvas.toDataURL('image/jpeg', 0.8))
        }
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [onChange])

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Patient Photo</label>
      <div className="flex items-start gap-3">
        {/* Preview */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
          {value ? (
            <>
              <img src={value} alt="Patient" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(null)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow hover:bg-rose-600"
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <ImageIcon size={24} />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <Upload size={13} /> Upload
          </button>
          <button
            type="button"
            onClick={cameraOpen ? stopCamera : startCamera}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <Camera size={13} /> {cameraOpen ? 'Cancel' : 'Camera'}
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
      </div>

      {/* Camera preview */}
      {cameraOpen && (
        <div className="mt-2 space-y-2">
          <video ref={videoRef} autoPlay playsInline muted className="h-40 w-56 rounded-lg border border-slate-200 object-cover bg-black" />
          <button
            type="button"
            onClick={capture}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-violet-700"
          >
            <Camera size={13} /> Capture
          </button>
        </div>
      )}
    </div>
  )
}
