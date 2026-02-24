'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { useDecks } from '@/hooks/useSupabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  BrainCircuit, Plus, Play, Layers, Trash2, Clock
} from 'lucide-react';

const DECK_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function FlashcardsPage() {
  const router = useRouter();
  const { decks, loading, createDeck, deleteDeck } = useDecks();
  const [showCreate, setShowCreate] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState(DECK_COLORS[0]);

  const handleCreate = async () => {
    if (!newDeckName.trim()) return;
    const deck = await createDeck(newDeckName.trim(), newDeckDesc.trim() || undefined, selectedColor);
    if (deck) {
      setNewDeckName('');
      setNewDeckDesc('');
      setShowCreate(false);
      toast.success(`Baralho "${deck.name}" criado!`);
    } else {
      toast.error('Erro ao criar baralho');
    }
  };

  const totalCards = decks.reduce((sum, d) => sum + (d.card_count || 0), 0);
  const totalDue = decks.reduce((sum, d) => sum + (d.due_count || 0), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Flashcards</h1>
            <p className="text-muted-foreground">
              {totalCards} cards no total • {totalDue} para revisar
            </p>
          </div>
          <div className="flex gap-2">
            {totalDue > 0 && (
              <Button onClick={() => router.push('/flashcards/review')}>
                <Play className="h-4 w-4 mr-2" />
                Revisar Agora ({totalDue})
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Baralho
            </Button>
          </div>
        </div>

        {/* Create Deck Form */}
        {showCreate && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Nome do baralho..."
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                autoFocus
              />
              <Input
                placeholder="Descrição (opcional)..."
                value={newDeckDesc}
                onChange={(e) => setNewDeckDesc(e.target.value)}
              />
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground">Cor:</span>
                {DECK_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      selectedColor === color ? 'border-white scale-125' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate}>Criar Baralho</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decks Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {decks.map(deck => (
            <Card
              key={deck.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors group relative overflow-hidden"
              onClick={() => router.push(`/flashcards/create?deck_id=${deck.id}`)}
            >
              <div
                className="absolute top-0 left-0 w-full h-1"
                style={{ backgroundColor: deck.color }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="h-5 w-5" style={{ color: deck.color }} />
                    {deck.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDeck(deck.id);
                      toast.success('Baralho excluído');
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {deck.description && (
                  <p className="text-sm text-muted-foreground">{deck.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {deck.card_count || 0} cards
                  </span>
                  {(deck.due_count || 0) > 0 && (
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <Clock className="h-3 w-3" />
                      {deck.due_count} para revisar
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {!loading && decks.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <BrainCircuit className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum baralho ainda</p>
              <p className="text-sm">Crie seu primeiro baralho de flashcards</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Baralho
              </Button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
