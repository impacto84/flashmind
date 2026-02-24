'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { calculateSM2 } from '@/lib/spaced-repetition';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ArrowLeft, Check, X, Loader2, Trophy,
  Brain, ThumbsDown, ThumbsUp, Zap, Flame, Keyboard
} from 'lucide-react';
import type { Flashcard, ReviewQuality } from '@/types/database';

const supabase = createSupabaseBrowserClient();

const QUALITY_BUTTONS: { quality: ReviewQuality; label: string; shortcut: string; icon: React.ReactNode; color: string }[] = [
  { quality: 0, label: 'Esqueci', shortcut: '1', icon: <X className="h-5 w-5" />, color: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30' },
  { quality: 2, label: 'Difícil', shortcut: '2', icon: <ThumbsDown className="h-5 w-5" />, color: 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-orange-500/30' },
  { quality: 3, label: 'Bom', shortcut: '3', icon: <ThumbsUp className="h-5 w-5" />, color: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/30' },
  { quality: 5, label: 'Fácil', shortcut: '4', icon: <Zap className="h-5 w-5" />, color: 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30' },
];

export default function ReviewPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ reviewed: 0, correct: 0 });
  const [sessionDone, setSessionDone] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [startTime] = useState(new Date());

  useEffect(() => {
    const fetchDueCards = async () => {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .lte('next_review', new Date().toISOString())
        .order('next_review', { ascending: true })
        .limit(50);

      if (!error && data) {
        setCards(data);
        if (data.length > 0) {
          toast.info(`${data.length} cards para revisar. Vamos lá!`);
        }
      }
      setLoading(false);
    };
    fetchDueCards();
  }, []);

  const currentCard = cards[currentIndex];

  const handleReview = useCallback(async (quality: ReviewQuality) => {
    if (!currentCard || flipping) return;

    const result = calculateSM2({
      quality,
      repetitions: currentCard.repetitions,
      easeFactor: currentCard.ease_factor,
      interval: currentCard.interval,
    });

    await supabase
      .from('flashcards')
      .update({
        ease_factor: result.easeFactor,
        interval: result.interval,
        repetitions: result.repetitions,
        next_review: result.nextReview.toISOString(),
        last_reviewed: new Date().toISOString(),
      })
      .eq('id', currentCard.id);

    // Record study session
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('study_sessions').insert({
        user_id: user.id,
        type: 'flashcard_review',
        cards_reviewed: 1,
        cards_correct: quality >= 3 ? 1 : 0,
        duration_seconds: 0,
      });
    }

    setStats(prev => ({
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (quality >= 3 ? 1 : 0),
    }));

    setFlipping(true);
    setShowAnswer(false);

    setTimeout(() => {
      if (currentIndex + 1 >= cards.length) {
        setSessionDone(true);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
      setFlipping(false);
    }, 200);
  }, [currentCard, currentIndex, cards.length, flipping]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!showAnswer) {
          setShowAnswer(true);
        }
      } else if (showAnswer) {
        const qualityMap: Record<string, ReviewQuality> = { '1': 0, '2': 2, '3': 3, '4': 5 };
        if (qualityMap[e.key] !== undefined) {
          e.preventDefault();
          handleReview(qualityMap[e.key]);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showAnswer, handleReview]);

  const formatDuration = () => {
    const diff = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
    const min = Math.floor(diff / 60);
    const sec = diff % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // Loading skeleton
  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
          <div className="flex justify-between">
            <div className="h-9 w-20 bg-muted/30 rounded" />
            <div className="h-5 w-32 bg-muted/30 rounded" />
          </div>
          <div className="h-2 bg-muted/30 rounded-full" />
          <div className="h-[300px] bg-muted/20 rounded-lg border border-border" />
        </div>
      </MainLayout>
    );
  }

  if (cards.length === 0) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <Trophy className="h-10 w-10 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Tudo em dia!</h1>
          <p className="text-muted-foreground mb-6">
            Você não tem flashcards para revisar agora. Volte mais tarde!
          </p>
          <Button onClick={() => router.push('/flashcards')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Baralhos
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (sessionDone) {
    const accuracy = stats.reviewed > 0 ? Math.round((stats.correct / stats.reviewed) * 100) : 0;
    const emoji = accuracy >= 80 ? '🔥' : accuracy >= 60 ? '💪' : '📚';
    return (
      <MainLayout>
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <Trophy className="h-10 w-10 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Sessão Concluída! {emoji}</h1>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-2xl font-bold text-primary">{stats.reviewed}</p>
              <p className="text-xs text-muted-foreground">Revisados</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-2xl font-bold text-green-400">{accuracy}%</p>
              <p className="text-xs text-muted-foreground">Precisão</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-2xl font-bold text-orange-400">{formatDuration()}</p>
              <p className="text-xs text-muted-foreground">Duração</p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push('/flashcards')}>
              Voltar aos Baralhos
            </Button>
            <Button onClick={() => router.push('/')}>
              Dashboard
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/flashcards')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sair
          </Button>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{currentIndex + 1} / {cards.length}</span>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" />
              {stats.correct}
            </span>
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-orange-400" />
              {formatDuration()}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>

        {/* Card with flip transition */}
        <div className={`transition-all duration-200 ${flipping ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <Card
            className="min-h-[300px] cursor-pointer flex items-center justify-center hover:border-primary/30 transition-colors"
            onClick={() => !showAnswer && setShowAnswer(true)}
          >
            <CardContent className="p-8 text-center w-full">
              {!showAnswer ? (
                <div className="space-y-4">
                  <Brain className="h-8 w-8 mx-auto text-primary opacity-50" />
                  <p className="text-xl font-medium whitespace-pre-wrap">
                    {currentCard.front}
                  </p>
                  <p className="text-sm text-muted-foreground mt-8">
                    Clique ou pressione <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Espaço</kbd> para ver a resposta
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-border">
                    <p className="text-sm text-muted-foreground mb-1">Pergunta</p>
                    <p className="font-medium">{currentCard.front}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Resposta</p>
                    <p className="text-lg font-medium text-primary whitespace-pre-wrap">
                      {currentCard.back}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quality Buttons */}
        {showAnswer && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-3">
              {QUALITY_BUTTONS.map(({ quality, label, shortcut, icon, color }) => (
                <Button
                  key={quality}
                  variant="ghost"
                  className={`h-auto py-4 flex flex-col gap-1.5 border ${color}`}
                  onClick={() => handleReview(quality)}
                >
                  {icon}
                  <span className="text-xs font-medium">{label}</span>
                  <kbd className="text-[10px] px-1.5 py-0.5 bg-background/50 rounded font-mono opacity-60">{shortcut}</kbd>
                </Button>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Keyboard className="h-3 w-3" />
              Use as teclas 1-4 para responder rapidamente
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
