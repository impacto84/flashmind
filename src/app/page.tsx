'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText, BrainCircuit, Layers, Network, Play, Plus, Clock,
  Sparkles, Flame, Trophy, Target, TrendingUp, Calendar
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useUser } from '@/hooks/useSupabase';

// Lazy load Recharts to avoid SSR issues
const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });

const supabase = createSupabaseBrowserClient();

interface DashboardStats {
  documents: number;
  flashcards: number;
  dueCards: number;
  decks: number;
  mindmaps: number;
  streak: number;
  totalReviewed: number;
  weeklyData: { day: string; cards: number; correct: number }[];
}

export default function Home() {
  const { user, loading: userLoading } = useUser();
  const [stats, setStats] = useState<DashboardStats>({
    documents: 0, flashcards: 0, dueCards: 0, decks: 0, mindmaps: 0,
    streak: 0, totalReviewed: 0, weeklyData: [],
  });
  const [recentDocs, setRecentDocs] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const [docs, cards, dueCards, decksRes, maps] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('flashcards').select('id', { count: 'exact', head: true }),
        supabase.from('flashcards').select('id', { count: 'exact', head: true }).lte('next_review', new Date().toISOString()),
        supabase.from('decks').select('id', { count: 'exact', head: true }),
        supabase.from('mindmaps').select('id', { count: 'exact', head: true }),
      ]);

      // Study sessions for streak & chart
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Calculate streak
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        const hasSession = sessions?.some(s => s.created_at.startsWith(dateStr));
        if (hasSession || i === 0) {
          if (hasSession) streak++;
          else if (i === 0) continue; // today might not have a session yet
        } else break;
      }

      // Weekly chart data
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const weeklyData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toISOString().split('T')[0];
        const daySessions = sessions?.filter(s => s.created_at.startsWith(dateStr)) || [];
        return {
          day: days[date.getDay()],
          cards: daySessions.reduce((sum, s) => sum + (s.cards_reviewed || 0), 0),
          correct: daySessions.reduce((sum, s) => sum + (s.cards_correct || 0), 0),
        };
      });

      const totalReviewed = sessions?.reduce((sum, s) => sum + (s.cards_reviewed || 0), 0) || 0;

      setStats({
        documents: docs.count || 0,
        flashcards: cards.count || 0,
        dueCards: dueCards.count || 0,
        decks: decksRes.count || 0,
        mindmaps: maps.count || 0,
        streak,
        totalReviewed,
        weeklyData,
      });

      // Recent docs
      const { data: recent } = await supabase
        .from('documents')
        .select('id, title, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5);
      if (recent) setRecentDocs(recent);

      setLoading(false);
    };

    fetchStats();
  }, [user]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Loading skeleton
  if (userLoading || loading) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-pulse">
          <div>
            <div className="h-9 w-48 bg-muted/30 rounded mb-2" />
            <div className="h-5 w-64 bg-muted/20 rounded" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-muted/20 rounded-lg border border-border" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-64 bg-muted/20 rounded-lg border border-border" />
            <div className="h-64 bg-muted/20 rounded-lg border border-border" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{greeting()}!</h1>
            <p className="text-muted-foreground">
              Aqui está o resumo do seu aprendizado.
            </p>
          </div>
          {/* Streak badge */}
          {stats.streak > 0 && (
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="font-bold text-orange-400">{stats.streak}</span>
              <span className="text-sm text-orange-400/80">
                dia{stats.streak !== 1 ? 's' : ''} seguido{stats.streak !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Due cards banner */}
        {stats.dueCards > 0 && (
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Você tem {stats.dueCards} flashcards para revisar</p>
                  <p className="text-sm text-muted-foreground">Manter a revisão em dia melhora a retenção em até 90%</p>
                </div>
              </div>
              <Link href="/flashcards/review">
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  Revisar Agora
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Link href="/documents">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documentos</CardTitle>
                <FileText className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.documents}</div>
                <p className="text-xs text-muted-foreground">Notas de estudo</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/flashcards">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Flashcards</CardTitle>
                <Layers className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.flashcards}</div>
                <p className="text-xs text-muted-foreground">
                  Em {stats.decks} baralho{stats.decks !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/flashcards/review">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Para Revisar</CardTitle>
                <BrainCircuit className="h-4 w-4 text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.dueCards}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.dueCards > 0 ? 'Cards pendentes' : 'Tudo em dia!'}
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/mindmaps">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mapas Mentais</CardTitle>
                <Network className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.mindmaps}</div>
                <p className="text-xs text-muted-foreground">Criados com IA</p>
              </CardContent>
            </Card>
          </Link>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revisados (7d)</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReviewed}</div>
              <p className="text-xs text-muted-foreground">Cards esta semana</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Weekly Progress Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Progresso Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.weeklyData.some(d => d.cards > 0) ? (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.weeklyData}>
                      <defs>
                        <linearGradient id="colorCards" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorCorrect" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="day"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cards"
                        stroke="hsl(var(--primary))"
                        fill="url(#colorCards)"
                        name="Revisados"
                      />
                      <Area
                        type="monotone"
                        dataKey="correct"
                        stroke="#22c55e"
                        fill="url(#colorCorrect)"
                        name="Corretos"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-center text-muted-foreground">
                  <div>
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Comece a revisar flashcards</p>
                    <p className="text-xs">para ver seu progresso aqui</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documentos Recentes</CardTitle>
              <Link href="/documents">
                <Button variant="ghost" size="sm">Ver todos</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentDocs.length > 0 ? (
                <div className="space-y-1">
                  {recentDocs.map(doc => (
                    <Link
                      key={doc.id}
                      href={`/documents/${doc.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted transition-colors"
                    >
                      <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.updated_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Nenhum documento ainda</p>
                  <Link href="/documents">
                    <Button variant="outline" size="sm" className="mt-2">
                      <Plus className="h-3 w-3 mr-1" />
                      Criar primeiro
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Start */}
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/documents" className="block">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Escrever notas</p>
                  <p className="text-xs text-muted-foreground">Crie documentos de estudo</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/flashcards" className="block">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Gerar flashcards com IA</p>
                  <p className="text-xs text-muted-foreground">A partir das suas notas</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/mindmaps" className="block">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Network className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Criar mapa mental</p>
                  <p className="text-xs text-muted-foreground">Visualize conceitos</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
