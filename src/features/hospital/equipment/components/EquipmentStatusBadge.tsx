type Status = 'Working' | 'UnderMaintenance' | 'NotWorking' | 'Condemned' | 'Spare';

export default function EquipmentStatusBadge({ status }: { status?: Status }) {
  const styles: Record<Status, string> = {
    Working: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    UnderMaintenance: 'bg-amber-100 text-amber-700 border-amber-200',
    NotWorking: 'bg-rose-100 text-rose-700 border-rose-200',
    Condemned: 'bg-slate-200 text-slate-700 border-slate-300',
    Spare: 'bg-sky-100 text-sky-700 border-sky-200',
  };

  const style = status ? styles[status] : 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {status || 'Unknown'}
    </span>
  );
}
