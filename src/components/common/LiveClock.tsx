import { useState, useEffect } from 'react'

/**
 * LiveClock - Displays current time in Pakistan timezone (PKT, UTC+5)
 * Updates every second and shows timezone name for verification
 */
export default function LiveClock({ 
  className = '',
  showSeconds = true,
  showTimezone = true,
  showDate = true,
  compact = false
}: {
  className?: string
  showSeconds?: boolean
  showTimezone?: boolean
  showDate?: boolean
  compact?: boolean
}) {
  const [time, setTime] = useState(() => formatPakistanTime(showSeconds))

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatPakistanTime(showSeconds))
    }, 1000)
    return () => clearInterval(interval)
  }, [showSeconds])

  if (compact) {
    return (
      <span className={className}>
        {showDate && <span>{getPakistanDateString()} </span>}
        <span>{time}</span>
        {showTimezone && <span className="ml-1 opacity-60 text-xs">PKT</span>}
      </span>
    )
  }

  return (
    <span className={className}>
      {showDate && (
        <span>{getPakistanDateString()}</span>
      )}
      {showDate && <span className="opacity-60 mx-1">·</span>}
      <span>{time}</span>
      {showTimezone && (
        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white/10 text-xs font-medium opacity-80">PKT</span>
      )}
    </span>
  )
}

/**
 * Get current time in Pakistan timezone formatted as HH:MM:SS or HH:MM
 */
function formatPakistanTime(showSeconds: boolean): string {
  const now = new Date()
  // Pakistan is UTC+5
  const pakOffset = 5 * 60 * 60 * 1000 // 5 hours in ms
  const pakTime = new Date(now.getTime() + pakOffset)
  
  const hours = String(pakTime.getUTCHours()).padStart(2, '0')
  const minutes = String(pakTime.getUTCMinutes()).padStart(2, '0')
  const seconds = String(pakTime.getUTCSeconds()).padStart(2, '0')
  
  if (showSeconds) {
    return `${hours}:${minutes}:${seconds}`
  }
  return `${hours}:${minutes}`
}

/**
 * Get current date in Pakistan timezone as YYYY-MM-DD
 */
function getPakistanDateString(): string {
  const now = new Date()
  const pakOffset = 5 * 60 * 60 * 1000
  const pakTime = new Date(now.getTime() + pakOffset)
  return pakTime.toISOString().slice(0, 10)
}
