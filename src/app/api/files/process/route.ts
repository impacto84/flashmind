import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  const uint8 = new Uint8Array(buffer);
  const text = new TextDecoder('latin1').decode(uint8);
  
  const textParts: string[] = [];
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(text)) !== null) {
    textParts.push(match[1]);
  }
  
  const tjArrayRegex = /\[([^\]]*)\]\s*TJ/gi;
  while ((match = tjArrayRegex.exec(text)) !== null) {
    const inner = match[1];
    const stringRegex = /\(([^)]*)\)/g;
    let strMatch;
    while ((strMatch = stringRegex.exec(inner)) !== null) {
      textParts.push(strMatch[1]);
    }
  }

  const extracted = textParts.join(' ').replace(/\\n/g, '\n').replace(/\s+/g, ' ').trim();
  return extracted || 'Não foi possível extrair texto deste PDF. Tente um PDF com texto selecionável.';
}

async function generateSummaryWithGemini(text: string): Promise<string> {
  if (!GEMINI_API_KEY) return 'Resumo não disponível (API key não configurada)';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Você é um assistente de estudo. Faça um resumo claro e organizado do seguinte texto.
O resumo deve ter no máximo 500 palavras, destacar os conceitos principais, usar linguagem clara e estar em português.

Texto:
${text.substring(0, 15000)}`
          }]
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1500 }
      }),
    }
  );

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Não foi possível gerar resumo.';
}

async function generateFlashcardsWithGemini(text: string): Promise<{ front: string; back: string }[]> {
  if (!GEMINI_API_KEY) return [];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Você é um assistente de estudo especializado em criar flashcards.
A partir do texto abaixo, gere entre 5 e 15 flashcards de alta qualidade.
Cada flashcard deve ter "front" (pergunta clara) e "back" (resposta concisa).
Foque nos conceitos mais importantes e testáveis.
Responda APENAS com JSON válido: {"flashcards": [{"front": "...", "back": "..."}, ...]}

Texto:
${text.substring(0, 15000)}`
          }]
        }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 3000 }
      }),
    }
  );

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.flashcards || [];
  }
  return [];
}

// POST /api/files/process - Process a file with AI
export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_id, action } = await request.json();
    if (!file_id) return NextResponse.json({ error: 'file_id is required' }, { status: 400 });

    const { data: fileRecord, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', file_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await supabase.from('files').update({ status: 'processing' }).eq('id', file_id);

    let extractedText = fileRecord.extracted_text;

    if (!extractedText) {
      try {
        if (fileRecord.file_type === 'pdf') {
          const { data: fileData, error: dlError } = await supabase.storage
            .from('files')
            .download(fileRecord.storage_path);
          if (dlError || !fileData) throw new Error('Could not download file');
          const buffer = await fileData.arrayBuffer();
          extractedText = await extractTextFromPDF(buffer);
        } else if (fileRecord.file_type === 'txt') {
          const { data: fileData, error: dlError } = await supabase.storage
            .from('files')
            .download(fileRecord.storage_path);
          if (dlError || !fileData) throw new Error('Could not download file');
          extractedText = await fileData.text();
        } else {
          extractedText = 'Tipo de arquivo não suportado para extração de texto.';
        }
        await supabase.from('files').update({ extracted_text: extractedText }).eq('id', file_id);
      } catch (err) {
        console.error('Text extraction error:', err);
        await supabase.from('files').update({ 
          status: 'error', error_message: 'Falha na extração de texto' 
        }).eq('id', file_id);
        return NextResponse.json({ error: 'Text extraction failed' }, { status: 500 });
      }
    }

    const result: { summary?: string; flashcards?: { front: string; back: string }[] } = {};

    if (action === 'summarize' || action === 'both') {
      const summary = await generateSummaryWithGemini(extractedText);
      await supabase.from('files').update({ summary }).eq('id', file_id);
      result.summary = summary;
    }

    if (action === 'flashcards' || action === 'both') {
      const flashcards = await generateFlashcardsWithGemini(extractedText);
      result.flashcards = flashcards;

      if (flashcards.length > 0) {
        const { data: folder } = await supabase
          .from('folders').select('name').eq('id', fileRecord.folder_id).single();

        const deckName = `📄 ${fileRecord.name} (${folder?.name || 'Pasta'})`;
        const { data: deck } = await supabase
          .from('decks')
          .insert({ user_id: user.id, name: deckName, color: '#6366f1' })
          .select().single();

        if (deck) {
          const cardsToInsert = flashcards.map(fc => ({
            user_id: user.id, deck_id: deck.id, front: fc.front, back: fc.back,
          }));
          await supabase.from('flashcards').insert(cardsToInsert);
          await supabase.from('decks').update({ card_count: flashcards.length }).eq('id', deck.id);
        }

        await supabase.from('files').update({ flashcards_generated: true }).eq('id', file_id);
      }
    }

    await supabase.from('files').update({ status: 'processed' }).eq('id', file_id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Process error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
