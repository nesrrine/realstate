'use client';

import { usePathname } from 'next/navigation';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { Toaster } from 'sonner';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { AiChatWidget } from '@/components/ai/ai-chat-widget';
import { ScrollProgress } from '@/components/motion/scroll-progress';

export function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = !pathname.startsWith('/crm') && pathname !== '/login';

  return (
    <QueryProvider>
      <AuthProvider>
        {isPublicRoute && <ScrollProgress />}
        {isPublicRoute && <SiteHeader />}
        <main className="flex-1">{children}</main>
        {isPublicRoute && <SiteFooter />}
        {isPublicRoute && <AiChatWidget />}
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryProvider>
  );
}