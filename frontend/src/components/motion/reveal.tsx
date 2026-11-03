'use client';

import { createElement, useEffect, useRef, useState, type ReactNode } from 'react';

export type RevealVariant = 'up' | 'down' | 'left' | 'right' | 'zoom' | 'fade' | 'blur';

interface RevealProps {
  children: ReactNode;
  /** Sens de l'apparition */
  variant?: RevealVariant;
  /** Délai en ms (pour décaler les éléments d'une grille) */
  delay?: number;
  /** Durée en ms */
  duration?: number;
  as?: 'div' | 'section' | 'li' | 'span' | 'article';
  className?: string;
}

/**
 * Fait apparaître son contenu quand il entre à l'écran (une seule fois).
 * Sans JavaScript ou avec « réduire les animations », le contenu reste visible :
 * l'état caché n'existe que sous <html class="motion-ready"> (voir globals.css).
 */
export function Reveal({ children, variant = 'up', delay = 0, duration = 700, as = 'div', className }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return createElement(
    as,
    {
      ref,
      className,
      'data-reveal': variant,
      'data-shown': shown ? '' : undefined,
      style: { transitionDelay: `${delay}ms`, transitionDuration: `${duration}ms` },
    },
    children,
  );
}
