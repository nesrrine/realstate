import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Décodage du payload JWT compatible Edge runtime (sans Buffer)
function decodeJwtToken(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token');
  const { pathname } = request.nextUrl;

  // Pas de token : retour au login
  if (pathname.startsWith('/crm') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Déjà connecté : pas besoin de la page login
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/crm/dashboard', request.url));
  }

  // Un AGENT ne peut pas accéder à la gestion des agents
  if (token) {
    const jwtPayload = decodeJwtToken(token.value);
    const role = jwtPayload?.role as 'ADMIN' | 'MANAGER' | 'AGENT' | undefined;

    if (pathname.startsWith('/crm/agents') && role === 'AGENT') {
      return NextResponse.redirect(new URL('/crm/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/crm/:path*', '/login'],
};