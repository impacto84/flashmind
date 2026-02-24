import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

function getFileType(mime: string): string {
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('word') || mime.includes('document')) return 'docx';
  if (mime.startsWith('text/')) return 'txt';
  if (mime.startsWith('image/')) return 'image';
  return 'other';
}

// GET /api/files?folder_id=xxx - List files in a folder
export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folder_id');

    let query = supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (folderId) {
      query = query.eq('folder_id', folderId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Files GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}

// POST /api/files - Upload a file
export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folder_id') as string;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!folderId) return NextResponse.json({ error: 'folder_id is required' }, { status: 400 });

    // Max 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop() || 'bin';
    const storagePath = `${user.id}/${folderId}/${Date.now()}_${file.name}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 });
    }

    // Create DB record
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        user_id: user.id,
        folder_id: folderId,
        name: file.name.replace(`.${fileExt}`, ''),
        original_name: file.name,
        file_type: getFileType(file.type),
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: storagePath,
        status: 'uploaded',
      })
      .select()
      .single();

    if (dbError) throw dbError;
    return NextResponse.json(fileRecord, { status: 201 });
  } catch (error) {
    console.error('Files POST error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

// DELETE /api/files - Delete a file
export async function DELETE(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    // Get file record first to delete from storage
    const { data: fileRecord } = await supabase
      .from('files')
      .select('storage_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fileRecord?.storage_path) {
      await supabase.storage.from('files').remove([fileRecord.storage_path]);
    }

    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Files DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
