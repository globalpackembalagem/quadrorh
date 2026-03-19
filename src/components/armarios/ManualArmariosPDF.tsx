import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ManualArmariosPDF() {
  const navigate = useNavigate();

  return (
    <Button variant="outline" size="sm" onClick={() => navigate('/armarios-femininos/manual')} className="gap-2">
      <BookOpen className="h-4 w-4" />
      Manual
    </Button>
  );
}
