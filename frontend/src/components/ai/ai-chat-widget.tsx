'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Building2, Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react';

import { publicService } from '@/services/public.service';
import type { ChatListing, ChatTurn } from '@/services/ai.service';
import { formatPrice } from '@/lib/public-constants';
import { cn } from '@/lib/utils';

interface UiMessage extends ChatTurn {
  properties?: ChatListing[];
}

const WELCOME: UiMessage = {
  role: 'assistant',
  content:
    'Bonjour 👋 Je suis l’assistant de l’agence. Dites-moi ce que vous cherchez (type, ville, budget…) et je vous propose nos biens disponibles.',
};

/** Bulle d'assistance du site public (biens publiés uniquement). */
export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      // Le message d'accueil n'est pas envoyé : la conversation commence par le visiteur
      const history = next.slice(1).slice(-12).map(({ role, content }) => ({ role, content }));
      const r = await publicService.aiChat(history);
      setMessages([
        ...next,
        {
          role: 'assistant',
          content: r.leadCreated ? `${r.reply}\n\n✅ Un conseiller vous rappellera rapidement.` : r.reply,
          properties: r.properties,
        },
      ]);
    } catch {
      setMessages([
        ...next,
        {
          role: 'assistant',
          content: 'Désolé, je ne peux pas répondre pour le moment. Contactez-nous directement via la page Contact.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-40 right-4 z-50 flex h-[540px] max-h-[calc(100vh-11rem)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-300" />
              <span className="text-sm font-semibold">Assistant immobilier</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fermer" className="rounded p-1 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm',
                    m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 shadow-sm',
                  )}
                >
                  {m.content}
                </div>
                {m.properties && m.properties.length > 0 && (
                  <div className="mt-2 w-full space-y-2">
                    {m.properties.map((p) => (
                      <Link
                        key={p.id}
                        href={`/biens/${p.id}`}
                        className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2 hover:border-blue-300"
                      >
                        <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {p.coverUrl ? (
                            <Image src={p.coverUrl} alt="" fill sizes="64px" className="object-cover" />
                          ) : (
                            <Building2 className="m-auto mt-4 h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{p.title}</p>
                          <p className="text-xs text-slate-500">
                            {p.city} · {p.surface} m²
                          </p>
                          <p className="text-xs font-semibold text-blue-700">
                            {formatPrice(p.price)}
                            {p.transactionType === 'RENTAL' ? '/mois' : ''}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> L’assistant écrit…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-2">
            <input
              className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
              placeholder="Votre message…"
              value={input}
              maxLength={1000}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
        aria-label={open ? 'Fermer l’assistant' : 'Ouvrir l’assistant'}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
