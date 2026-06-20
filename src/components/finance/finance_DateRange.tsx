import { DateRangePicker } from '../common/DatePicker'

interface DateRange {
  from: string
  to: string
}

interface DateRangeFilterProps {
  value: DateRange
  onChange: (value: DateRange) => void
}

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <DateRangePicker value={value} onChange={onChange} dark />
  )
}
