'use client';

import { timeNow } from '@/lib/format';

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

export default function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [h, m] = value ? value.split(':') : ['', ''];
  const hours = h || '00';
  const minutes = m || '00';

  return (
    <div className="timepick">
      <select
        value={hours}
        onChange={(e) => onChange(`${e.target.value}:${minutes}`)}
        aria-label="Hours"
      >
        {HOURS.map((hh) => (
          <option key={hh} value={hh}>
            {hh}
          </option>
        ))}
      </select>
      <span className="colon">:</span>
      <select
        value={minutes}
        onChange={(e) => onChange(`${hours}:${e.target.value}`)}
        aria-label="Minutes"
      >
        {MINUTES.map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </select>
      <button type="button" className="now" onClick={() => onChange(timeNow())}>
        Now
      </button>
    </div>
  );
}
