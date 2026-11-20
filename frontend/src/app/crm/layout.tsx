'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/providers/AuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);

  // Fermer le menu mobile après chaque navigation
  useEffect(() => setMobileNav(false), [pathname]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-2 text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    // fixed inset-0 : le CRM = exactement la fenêtre, aucune scrollbar de page
    <div className="fixed inset-0 flex overflow-hidden bg-slate-50">
      {/* Sidebar desktop */}
      <Sidebar className="hidden h-full shrink-0 md:flex" />

      {/* Sidebar mobile (overlay) */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <Sidebar className="h-full shrink-0 shadow-xl" />
          <button
            type="button"
            aria-label="Fermer le menu"
            className="flex-1 bg-black/40"
            onClick={() => setMobileNav(false)}
          />
        </div>
      )}

      {/* Colonne contenu */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0">
          <Header onMenuClick={() => setMobileNav(true)} />
        </div>

        {/* SEUL élément qui défile */}
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}