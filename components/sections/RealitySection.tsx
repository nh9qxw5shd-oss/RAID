'use client';

import SectionCard from '../SectionCard';
import TimePicker from '../TimePicker';
import { INCIDENT_TYPES, Debrief } from '@/lib/types';

type RealityFields = Pick<
  Debrief,
  | 'ref'
  | 'tda_ref'
  | 'minutes_ref'
  | 'cancellation_ref'
  | 'title'
  | 'incident_date'
  | 'incident_time'
  | 'incident_type'
  | 'location'
  | 'summary'
>;

export default function RealitySection({
  value,
  onChange,
}: {
  value: RealityFields;
  onChange: (patch: Partial<RealityFields>) => void;
}) {
  return (
    <SectionCard badge="R" title="Reality" hint="The agreed facts — objective, no interpretation">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <label className="label-micro mb-1.5 block">Incident Ref</label>
          <input
            className="input input-mono"
            value={value.ref}
            onChange={(e) => onChange({ ref: e.target.value })}
            placeholder="INC-XXXXX"
          />
        </div>
        <div className="md:col-span-5">
          <label className="label-micro mb-1.5 block">Title</label>
          <input
            className="input"
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Short incident title"
          />
        </div>
        <div className="md:col-span-4">
          <label className="label-micro mb-1.5 block">Incident Type</label>
          <select
            className="select"
            value={value.incident_type}
            onChange={(e) => onChange({ incident_type: e.target.value })}
          >
            <option value="">Select…</option>
            {INCIDENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="label-micro mb-1.5 block">Date</label>
          <input
            type="date"
            className="input input-mono"
            value={value.incident_date}
            onChange={(e) => onChange({ incident_date: e.target.value })}
          />
        </div>
        <div className="md:col-span-3">
          <label className="label-micro mb-1.5 block">Time</label>
          <TimePicker
            value={value.incident_time}
            onChange={(t) => onChange({ incident_time: t })}
          />
        </div>
        <div className="md:col-span-6">
          <label className="label-micro mb-1.5 block">Location</label>
          <input
            className="input"
            value={value.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="e.g. ECML, Newark area — Up Main"
          />
        </div>

        <div className="md:col-span-4">
          <label className="label-micro mb-1.5 block">TDA Ref</label>
          <input
            className="input input-mono"
            value={value.tda_ref}
            onChange={(e) => onChange({ tda_ref: e.target.value })}
            placeholder="TDA reference"
          />
        </div>
        <div className="md:col-span-4">
          <label className="label-micro mb-1.5 block">Minutes Ref</label>
          <input
            className="input input-mono"
            value={value.minutes_ref}
            onChange={(e) => onChange({ minutes_ref: e.target.value })}
            placeholder="Meeting minutes reference"
          />
        </div>
        <div className="md:col-span-4">
          <label className="label-micro mb-1.5 block">Cancellation Ref</label>
          <input
            className="input input-mono"
            value={value.cancellation_ref}
            onChange={(e) => onChange({ cancellation_ref: e.target.value })}
            placeholder="Cancellation reference"
          />
        </div>

        <div className="md:col-span-12">
          <label className="label-micro mb-1.5 block">Factual Summary</label>
          <textarea
            className="textarea"
            rows={3}
            value={value.summary}
            onChange={(e) => onChange({ summary: e.target.value })}
            placeholder="A concise, factual account of what happened. Objective and agreed — interpretation belongs below."
          />
        </div>
      </div>
    </SectionCard>
  );
}
