'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import ControlGate from '@/components/ControlGate';
import EntityPanel from '@/components/EntityPanel';
import DistributionPanel from '@/components/DistributionPanel';

export default function SettingsPage() {
  return (
    <>
      <Header />
      <ControlGate>
        <main className="mx-auto max-w-4xl px-6 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="label-micro mb-1">Control</p>
              <h1 className="serif text-[32px] leading-none text-[var(--ink-100)]">Settings</h1>
            </div>
            <Link href="/" className="btn btn-ghost">
              <ArrowLeft size={14} /> Dashboard
            </Link>
          </div>

          <div className="space-y-6">
            <EntityPanel />
            <DistributionPanel />
          </div>
        </main>
      </ControlGate>
    </>
  );
}
