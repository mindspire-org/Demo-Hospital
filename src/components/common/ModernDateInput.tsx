import DatePicker from './DatePicker'

interface ModernDateInputProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export default function ModernDateInput({ label, value, onChange }: ModernDateInputProps) {
  return <DatePicker label={label} value={value} onChange={onChange} />
}
