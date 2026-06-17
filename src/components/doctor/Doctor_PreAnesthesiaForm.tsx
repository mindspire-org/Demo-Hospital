import React from 'react';

export type PreAnesthesiaData = {
  isApplied: boolean;
  history: {
    cvs: string;
    respiratory: string;
    renal: string;
    hepatic: string;
    diabetic: string;
    neurology: string;
    previousAnesthesia: string;
    allergies: string;
  };
  examination: {
    mallampatiScore: string;
    asaClass: string;
    airway: string;
    teeth: string;
    notes: string;
  };
  recommendation: string;
};

interface Props {
  data: PreAnesthesiaData;
  onChange: (data: PreAnesthesiaData) => void;
}

export default function Doctor_PreAnesthesiaForm({ data, onChange }: Props) {
  const updateHistory = (field: keyof PreAnesthesiaData['history'], value: string) => {
    onChange({
      ...data,
      isApplied: true,
      history: { ...data.history, [field]: value }
    });
  };

  const updateExam = (field: keyof PreAnesthesiaData['examination'], value: string) => {
    onChange({
      ...data,
      isApplied: true,
      examination: { ...data.examination, [field]: value }
    });
  };

  return (
    <div className="space-y-6 bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-lg font-bold text-blue-800">Pre-Anesthesia Assessment</h3>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.isApplied}
            onChange={(e) => onChange({ ...data, isApplied: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Enable Assessment</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Medical History */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700 border-l-4 border-blue-500 pl-2">Systemic History</h4>
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'CVS', field: 'cvs' },
              { label: 'Respiratory', field: 'respiratory' },
              { label: 'Renal', field: 'renal' },
              { label: 'Hepatic', field: 'hepatic' },
              { label: 'Diabetic', field: 'diabetic' },
              { label: 'Neurology', field: 'neurology' },
              { label: 'Prev. Anesthesia', field: 'previousAnesthesia' },
              { label: 'Allergies', field: 'allergies' },
            ].map((item) => (
              <div key={item.field} className="flex flex-col">
                <label className="text-xs font-medium text-gray-500 mb-1">{item.label}</label>
                <input
                  type="text"
                  value={(data.history as any)[item.field] || ''}
                  onChange={(e) => updateHistory(item.field as any, e.target.value)}
                  className="border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder={`Enter ${item.label.toLowerCase()} history...`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Physical Examination */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700 border-l-4 border-green-500 pl-2">Physical Examination</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-500 mb-1">Mallampati Score</label>
              <select
                value={data.examination.mallampatiScore}
                onChange={(e) => updateExam('mallampatiScore', e.target.value)}
                className="border rounded px-2 py-1 text-sm outline-none"
              >
                <option value="">Select Score</option>
                <option value="I">Class I</option>
                <option value="II">Class II</option>
                <option value="III">Class III</option>
                <option value="IV">Class IV</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-500 mb-1">ASA Class</label>
              <select
                value={data.examination.asaClass}
                onChange={(e) => updateExam('asaClass', e.target.value)}
                className="border rounded px-2 py-1 text-sm outline-none"
              >
                <option value="">Select Class</option>
                <option value="I">ASA I</option>
                <option value="II">ASA II</option>
                <option value="III">ASA III</option>
                <option value="IV">ASA IV</option>
                <option value="V">ASA V</option>
                <option value="VI">ASA VI</option>
                <option value="E">Emergency (E)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1">Airway Assessment</label>
            <textarea
              value={data.examination.airway}
              onChange={(e) => updateExam('airway', e.target.value)}
              className="border rounded px-2 py-1 text-sm h-16 outline-none"
              placeholder="Neck movement, mouth opening..."
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1">Teeth/Oral Cavity</label>
            <input
              type="text"
              value={data.examination.teeth}
              onChange={(e) => updateExam('teeth', e.target.value)}
              className="border rounded px-2 py-1 text-sm outline-none"
              placeholder="Loose teeth, dentures..."
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1">Exam Notes</label>
            <textarea
              value={data.examination.notes}
              onChange={(e) => updateExam('notes', e.target.value)}
              className="border rounded px-2 py-1 text-sm h-16 outline-none"
              placeholder="Any other exam findings..."
            />
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <label className="block text-sm font-bold text-gray-700 mb-2">Final Recommendation / Clearance Status</label>
        <textarea
          value={data.recommendation}
          onChange={(e) => onChange({ ...data, recommendation: e.target.value, isApplied: true })}
          className="w-full border-2 border-blue-100 rounded-lg p-3 text-sm focus:border-blue-500 outline-none"
          rows={3}
          placeholder="e.g., Fit for General Anesthesia with high risk consent..."
        />
      </div>
    </div>
  );
}
