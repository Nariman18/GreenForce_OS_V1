import { Compass } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page or project you are looking for does not exist, or you do not have access to it."
        action={<ButtonLink href="/">Back to projects</ButtonLink>}
      />
    </main>
  );
}
