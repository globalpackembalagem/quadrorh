import Sopro from './Sopro';
import Decoracao from './Decoracao';
import { Separator } from '@/components/ui/separator';

export default function QuadroGeral() {
  return (
    <div className="space-y-10">
      <Sopro />
      <Separator className="my-8" />
      <Decoracao />
    </div>
  );
}
