import TimePicker from './TimePicker'

interface ModernTimeInputProps {
  label?: string
  value: string
  onChange: (value: string) => void
  minuteStep?: number
}

export default function ModernTimeInput({ label, value, onChange, minuteStep }: ModernTimeInputProps) {
  return <TimePicker label={label} value={value} onChange={onChange} minuteStep={minuteStep} />
}
