'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Chiffre qui défile de 0 jusqu'à sa valeur quand il apparaît à l'écran.
 * Accepte « 500+ », « 98% », « 15 » : le nombre est animé, le suffixe conservé.
 */
export function CountUp({ value, duration = 1600, className }: { value: string; duration?: number; className?: string }) {
  const match = value.match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/);
  const target = match ? Number(match[2].replace(',', '.')) : 0;
  // Valeur finale au rendu serveur (moteurs de recherche, sans JavaScript), remise à 0 avant l'animation
  const [current, setCurrent] = useState(target);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !match) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      setCurrent(target);
      return;
    }
    let frame = 0;
    setCurrent(0);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // ralentit à l'arrivée
        setCurrent(Math.round(target * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  if (!match) return <span className={className}>{value}</span>;
  return (
    <span ref={ref} className={className} aria-label={value}>
      {match[1]}
      {current}
      {match[3]}
    </span>
  );
}
