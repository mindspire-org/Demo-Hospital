import DailyProgressSheet from './DailyProgressForm'

export default function DailyProgress({ encounterId }: { encounterId: string }){
  return (
    <DailyProgressSheet encounterId={encounterId} />
  )
}
