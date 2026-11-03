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
    <div className={cn("flex h-full w-64 flex-col bg-[var(--crm-sidebar)] text-[var(--crm-sidebar-fg)]", className)}>
      {/* Logo */}
      <Link href="/crm/dashboard" className="flex h-16 items-center gap-3 px-5 border-b border-white/10">
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
          <span className="block text-[10px] font-medium uppercase tracking-wider text-white/50">CRM</span>
        </div>
      </Link>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-[var(--crm-sidebar-accent)] flex items-center justify-center text-white font-semibold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-[var(--crm-sidebar-muted)] truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-[var(--crm-sidebar-accent)] text-white'
                  : 'text-[var(--crm-sidebar-fg)] hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-white/10 p-3 space-y-1">
        <Link
          href="/crm/notifications"
          className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-[var(--crm-sidebar-fg)] hover:bg-white/10 hover:text-white transition-colors"
        >
          <Bell className="mr-3 h-5 w-5" />
          Notifications
        </Link>
        <Link
          href="/crm/profile"
          className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-[var(--crm-sidebar-fg)] hover:bg-white/10 hover:text-white transition-colors"
        >
          <UserCircle className="mr-3 h-5 w-5" />
          Profil
        </Link>
        {/* Paramètres de l'agence : modifiables par le gérant / admin uniquement */}
        {(isManager || isAdmin) && (
          <Link
            href="/crm/settings"
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-[var(--crm-sidebar-fg)] hover:bg-white/10 hover:text-white transition-colors"
          >
            <Settings className="mr-3 h-5 w-5" />
            Paramètres
          </Link>
        )}
        <button
          onClick={() => logout()}
          className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-[var(--crm-sidebar-fg)] hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}