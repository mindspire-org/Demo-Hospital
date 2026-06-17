import { useEffect, useRef, useState } from 'react'
import { X, Camera, AlertCircle } from 'lucide-react'
// import jsQR from "jsqr"; // Package not installed

type Props = {
  open: boolean
  onClose: () => void
  onScan: (data: string) => void
}

export default function QRScanner({ open, onClose, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string>('')
  const [scanning, setScanning] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (open) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [open])

  const startCamera = async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      })
      
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setScanning(true)
        scanQRCode()
      }
    } catch (err) {
      console.error('Camera error:', err)
      setError('Unable to access camera. Please grant camera permissions.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  const scanQRCode = () => {
    if (!scanning || !videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    const scan = () => {
      if (!scanning || video.readyState !== video.HAVE_ENOUGH_DATA) {
        requestAnimationFrame(scan)
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      // QR scanning disabled - jsQR package not installed
      // const code = jsQR(imageData.data, imageData.width, imageData.height)
      // if (code && code.data) {
      //   console.log('QR Code detected:', code.data)
      //   stopCamera()
      //   onScan(code.data)
      //   onClose()
      // } else {
      requestAnimationFrame(scan)
      // }
    }

    requestAnimationFrame(scan)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white">
          <div>
            <h3 className="text-xl font-bold">Scan QR Code</h3>
            <p className="text-sm text-blue-100">Point camera at the QR code on the report</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-blue-700 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="p-6">
          {error ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="rounded-full bg-red-100 p-4">
                <AlertCircle className="h-16 w-16 text-red-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-900">{error}</p>
                <p className="text-sm text-slate-500 mt-2">Please check your browser settings</p>
              </div>
              <button
                onClick={startCamera}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full rounded-lg bg-black"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scanning Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64">
                  {/* Corner Brackets */}
                  <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-blue-500"></div>
                  <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-blue-500"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-blue-500"></div>
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-blue-500"></div>
                  
                  {/* Scanning Line Animation */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute w-full h-1 bg-blue-500 animate-scan"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-600">
            <Camera className="h-4 w-4" />
            <span>Position the QR code within the frame</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-700 font-bold text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(256px); }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  )
}
