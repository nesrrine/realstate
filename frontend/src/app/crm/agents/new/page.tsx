import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgentForm } from '@/components/agents/agent-form';

export default function NewAgentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/crm/agents">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nouvel agent</h1>
          <p className="text-muted-foreground">Créer un compte collaborateur</p>
        </div>
      </div>
      <AgentForm mode="create" />
    </div>
  );
}
