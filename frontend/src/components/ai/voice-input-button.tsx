'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Reconnaissance vocale du navigateur (Chrome, Edge) : aucune API externe.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface Props {
  /** Texte dicté (phrases finalisées), à ajouter au champ. */
  onText: (text: string) => void;
  lang?: string;
  className?: string;
}

export function VoiceInputButton({ onText, lang = 'fr-FR', className }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => setSupported(!!getRecognition()), []);
  useEffect(() => () => recRef.current?.stop(), []);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript;
      }
      if (text.trim()) onText(text.trim());
    };
    rec.onerror = (e) => {
      setError(e.error === 'not-allowed' ? 'Micro refusé par le navigateur' : 'Dictée interrompue');
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setError(null);
    setListening(true);
    rec.start();
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        size="sm"
        variant={listening ? 'destructive' : 'outline'}
        onClick={toggle}
        title={listening ? 'Arrêter la dictée' : 'Dicter'}
      >
        {listening ? <MicOff className="mr-1 h-4 w-4" /> : <Mic className="mr-1 h-4 w-4" />}
        {listening ? 'Arrêter' : 'Dicter'}
      </Button>
      {listening && <span className="animate-pulse text-xs text-red-600">● Écoute en cours…</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
