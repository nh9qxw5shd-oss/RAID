import { ReactNode } from 'react';

export default function SectionCard({
  badge,
  title,
  hint,
  children,
}: {
  badge: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="card tick-corners mb-3 animate-fade-up">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-3"
        style={{ background: 'linear-gradient(180deg, var(--bg-card-hi), var(--bg-card))' }}
      >
        <span className="pill" style={{ background: 'var(--nr-orange-glow)', border: '1px solid rgba(224,82,6,0.3)', color: 'var(--nr-orange)' }}>
          {badge}
        </span>
        <h2 className="flex-1 text-[13px] font-semibold text-[var(--ink-200)]">{title}</h2>
        {hint && <span className="hidden font-mono text-[10px] text-[var(--ink-500)] sm:block">{hint}</span>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
