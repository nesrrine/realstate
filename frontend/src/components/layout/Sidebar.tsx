'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCircle,
  Calendar,
  FileText,
  DollarSign,
  Settings,
  Bell,
  LogOut,
  UserPlus,
  KeyRound,
  Wallet,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { cashService } from '@/services/cash.service';
import { queryKeys } from '@/lib/query-keys';

const baseNavigation = [
  { name: 'Dashboard', href: '/crm/dashboard', icon: LayoutDashboard },
  { name: 'Propriétés', href: '/crm/properties', icon: Building2 },
  { name: 'Clients', href: '/crm/clients', icon: Users },
  { name: 'Propriétaires', href: '/crm/owners', icon: KeyRound },
  { name: 'Leads', href: '/crm/leads', icon: UserPlus },
  { name: 'Visites', href: '/crm/visits', icon: Calendar },
  { name: 'Transactions', href: '/crm/transactions', icon: FileText },
  { name: 'Commissions', href: '/crm/commissions', icon: DollarSign },
];

const adminNavigation = [
  { name: 'Agents', href: '/crm/agents', icon: UserCircle },
];

const linkBase =
  'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors';
const linkIdle =
  'text-[var(--crm-sidebar-fg)] hover:bg-white/10 hover:text-white';
const linkActive = 'bg-[var(--crm-sidebar-accent)] text-white';

export function Sidebar({ className }: { className?: string } = {}) {
  const pathname = usePathname();
  const { logout, user, isManager, isAdmin } = useAuth();

  // Frais & dépenses : gérant/admin, ou agent autorisé par le gérant
  const { data: cashAllowed = false } = useQuery({
    queryKey: queryKeys.cash.access,
    queryFn: cashService.getAccess,
    enabled: !!user && !(isManager || isAdmin),
    staleTime: 60_000,
  });
  const showCash = isManager || isAdmin || cashAllowed;

  const navigation = [
    ...((isManager || isAdmin)
      ? [...baseNavigation.slice(0, 4), ...adminNavigation, ...baseNavigation.slice(4)]
      : baseNavigation),
    ...(showCash ? [{ name: 'Frais & dépenses', href: '/crm/cash', icon: Wallet }] : []),
  ];

  return (
    <aside
      className={cn(
        // h-full + min-h-0 : la sidebar prend la hauteur de la fenêtre, pas plus
        'flex h-full min-h-0 w-64 shrink-0 flex-col bg-[var(--crm-sidebar)] text-[var(--crm-sidebar-fg)]',
        className
      )}
    >
      {/* Logo (ne rétrécit jamais) */}
      <Link
        href="/crm/dashboard"
        className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5"
      >
        <div className="shrink-0 rounded-lg bg-white p-1">
          <Image
            src="/logo-portail-immobilier.png"
            alt="Le Portail Immobilier"
            width={289}
            height={366}
            className="h-10 w-auto"
          />
        </div>
        <div className="leading-tight">
          <span className="block text-sm font-bold text-white">Le Portail Immobilier</span>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-white/50">
            CRM
          </span>
        </div>
      </Link>

      {/* Utilisateur (ne rétrécit jamais) */}
      <div className="shrink-0 border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--crm-sidebar-accent)] font-semibold text-white">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-[var(--crm-sidebar-muted)]">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation : SEULE zone qui défile dans la sidebar */}
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(linkBase, isActive ? linkActive : linkIdle)}
            >
              <item.icon className="mr-3 h-5 w-5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Actions du bas : toujours visibles, épinglées en bas */}
      <div className="shrink-0 space-y-1 border-t border-white/10 p-3">
        <Link href="/crm/notifications" className={cn(linkBase, linkIdle)}>
          <Bell className="mr-3 h-5 w-5 shrink-0" />
          Notifications
        </Link>
        <Link href="/crm/profile" className={cn(linkBase, linkIdle)}>
          <UserCircle className="mr-3 h-5 w-5 shrink-0" />
          Profil
        </Link>
        {/* Paramètres de l'agence : modifiables par le gérant / admin uniquement */}
        {(isManager || isAdmin) && (
          <Link href="/crm/settings" className={cn(linkBase, linkIdle)}>
            <Settings className="mr-3 h-5 w-5 shrink-0" />
            Paramètres
          </Link>
        )}
        <button
          type="button"
          onClick={() => logout()}
          className={cn(linkBase, linkIdle, 'w-full')}
        >
          <LogOut className="mr-3 h-5 w-5 shrink-0" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}