import { lazy, Suspense } from 'react';
import { Separator } from '@/components/ui/separator';
import { PageLoadingSkeleton } from '@/components/layout/PageLoadingSkeleton';

const Sopro = lazy(() => import('./Sopro'));
const Decoracao = lazy(() => import('./Decoracao'));
const ControleFaltas = lazy(() => import('./ControleFaltas'));

export default function Home() {
  return (
    <div className="space-y-10">
      <Suspense fallback={<PageLoadingSkeleton />}>
        <Sopro />
      </Suspense>
      <Separator className="my-8" />
      <Suspense fallback={<PageLoadingSkeleton />}>
        <Decoracao />
      </Suspense>
      <Separator className="my-8" />
      <Suspense fallback={<PageLoadingSkeleton />}>
        <ControleFaltas />
      </Suspense>
    </div>
  );
}
