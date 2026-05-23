'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/notifications';

export default function PwaInit() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
