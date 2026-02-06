'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/router';

export default function ConfigPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(ROUTES.ADMIN);
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <p className="text-neutral-500">Redirecting to Admin...</p>
    </div>
  );
}
