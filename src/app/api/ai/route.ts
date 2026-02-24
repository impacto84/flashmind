import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateWithOpenAI(content: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Você é um assistente de estudo especializado em criar flashcards de alta qualidade.
Dado um texto de estudo, gere flashcards no formato JSON.
Cada flashcard deve ter "front" (pergunta clara e específica) e "back" (resposta concisa mas completa).
Gere entre 5-15 flashcards dependendo da quantidade de conteúdo.
Foque nos conceitos mais importantes e testáveis.
Responda APENAS com JSON válido no formato: {"flashcards": [{"front": "...", "back": "..."}, ...]}`
        },
        {
          role: 'user',
          content: `Gere flashcards a partir deste texto:\n\n${content}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return JSON.parse(text);
}

async function generateWithGemini(content: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Você é um assistente de estudo. Gere flashcards a partir do texto abaixo.
Responda APENAS com JSON válido: {"flashcards": [{"front": "pergunta", "back": "resposta"}, ...]}
Gere entre 5-15 flashcards focando nos conceitos mais importantes.

Texto:
${content}`
          }]
        }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
      }),
    }
  );

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  // Extract JSON from possible markdown code blocks
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  throw new Error('Invalid response format');
}

export async function POST(request: Request) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try { cookieStore.set(name, value, options); } catch {}
            });
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, content } = await request.json();

    if (action === 'generate_flashcards') {
      let result;

      if (GEMINI_API_KEY) {
        result = await generateWithGemini(content);
      } else if (OPENAI_API_KEY) {
        result = await generateWithOpenAI(content);
      } else {
        // Fallback: simple extraction without AI
        const lines = content.split('\n').filter((l: string) => l.trim());
        const flashcards = [];
        for (let i = 0; i < Math.min(lines.length, 10); i += 2) {
          if (lines[i] && lines[i + 1]) {
            flashcards.push({
              front: `O que significa: "${lines[i].replace(/^[#\-*]\s*/, '').trim()}"?`,
              back: lines[i + 1]?.trim() || lines[i].trim(),
            });
          }
        }
        result = { flashcards };
      }

      return NextResponse.json(result);
    }

    if (action === 'generate_mindmap') {
      // Mind map generation
      let result;
      const prompt = `Analise o texto e crie um mapa mental em JSON.
Formato: {"id":"root","label":"Tema Central","children":[{"id":"1","label":"Subtópico","children":[...]}]}
Máximo 3 níveis de profundidade, 3-5 filhos por nó.
Responda APENAS com JSON válido.

Texto: ${content}`;

      if (GEMINI_API_KEY) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
            }),
          }
        );
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      } else if (OPENAI_API_KEY) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
          }),
        });
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        result = JSON.parse(text);
      }

      return NextResponse.json(result || { id: 'root', label: 'Sem dados', children: [] });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
  }
}
