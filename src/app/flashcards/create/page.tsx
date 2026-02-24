'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { useDecks, useFlashcards } from '@/hooks/useSupabase';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft, Plus, Sparkles, Loader2, Trash2, Save, Wand2
} from 'lucide-react';

const supabase = createSupabaseBrowserClient();

interface CardDraft {
  front: string;
  back: string;
}

function CreateFlashcardsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckIdParam = searchParams.get('deck_id');
  const documentIdParam = searchParams.get('document_id');

  const { decks } = useDecks();
  const [selectedDeckId, setSelectedDeckId] = useState(deckIdParam || '');
  const [cards, setCards] = useState<CardDraft[]>([{ front: '', back: '' }]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [docContent, setDocContent] = useState('');

  // Fetch document content if coming from a document
  useEffect(() => {
    if (documentIdParam) {
      supabase
        .from('documents')
        .select('content, title')
        .eq('id', documentIdParam)
        .single()
        .then(({ data }) => {
          if (data?.content) setDocContent(data.content);
        });
    }
  }, [documentIdParam]);

  useEffect(() => {
    if (deckIdParam) setSelectedDeckId(deckIdParam);
    else if (decks.length > 0 && !selectedDeckId) setSelectedDeckId(decks[0].id);
  }, [deckIdParam, decks, selectedDeckId]);

  const addCard = () => setCards(prev => [...prev, { front: '', back: '' }]);

  const removeCard = (index: number) => {
    setCards(prev => prev.filter((_, i) => i !== index));
  };

  const updateCard = (index: number, field: 'front' | 'back', value: string) => {
    setCards(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const generateWithAI = async () => {
    if (!docContent.trim()) return;
    setGenerating(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_flashcards',
          content: docContent.slice(0, 5000), // Limit content length
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.flashcards && Array.isArray(data.flashcards)) {
          setCards(data.flashcards);
        }
      }
    } catch (err) {
      console.error('AI generation failed:', err);
    }

    setGenerating(false);
  };

  const saveAll = async () => {
    if (!selectedDeckId) return;
    const validCards = cards.filter(c => c.front.trim() && c.back.trim());
    if (validCards.length === 0) return;

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const inserts = validCards.map(c => ({
      user_id: user.id,
      deck_id: selectedDeckId,
      document_id: documentIdParam || null,
      front: c.front.trim(),
      back: c.back.trim(),
    }));

    const { error } = await supabase.from('flashcards').insert(inserts);

    if (!error) {
      router.push('/flashcards');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button size="sm" onClick={saveAll} disabled={saving || !selectedDeckId}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar {cards.filter(c => c.front && c.back).length} Cards
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Criar Flashcards</h1>
        <p className="text-muted-foreground">
          {docContent ? 'Gere flashcards com IA ou crie manualmente' : 'Adicione cards ao seu baralho'}
        </p>
      </div>

      {/* Deck Selector */}
      <div className="space-y-2">
        <Label>Baralho</Label>
        <select
          value={selectedDeckId}
          onChange={(e) => setSelectedDeckId(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">Selecione um baralho</option>
          {decks.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* AI Generate */}
      {docContent && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wand2 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Gerar com IA</p>
                <p className="text-xs text-muted-foreground">
                  A IA vai analisar o documento e criar flashcards automaticamente
                </p>
              </div>
            </div>
            <Button size="sm" onClick={generateWithAI} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cards List */}
      <div className="space-y-4">
        {cards.map((card, index) => (
          <Card key={index}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Card {index + 1}
                </span>
                {cards.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCard(index)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
              <div>
                <Label className="text-xs">Frente (Pergunta)</Label>
                <textarea
                  value={card.front}
                  onChange={(e) => updateCard(index, 'front', e.target.value)}
                  placeholder="Ex: O que é fotossíntese?"
                  className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm min-h-[60px] resize-none"
                />
              </div>
              <div>
                <Label className="text-xs">Verso (Resposta)</Label>
                <textarea
                  value={card.back}
                  onChange={(e) => updateCard(index, 'back', e.target.value)}
                  placeholder="Ex: Processo pelo qual plantas convertem luz solar em energia..."
                  className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm min-h-[60px] resize-none"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" className="w-full" onClick={addCard}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Card
      </Button>
    </div>
  );
}

export default function CreateFlashcardsPage() {
  return (
    <MainLayout>
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <CreateFlashcardsContent />
      </Suspense>
    </MainLayout>
  );
}
