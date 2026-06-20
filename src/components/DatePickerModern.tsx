import DatePicker from './common/DatePicker'

interface DatePickerModernProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function DatePickerModern({ value, onChange, placeholder }: DatePickerModernProps) {
  return <DatePicker value={value} onChange={onChange} placeholder={placeholder} />
}
