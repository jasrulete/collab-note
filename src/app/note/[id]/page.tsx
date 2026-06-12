import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabaseServer';
import Editor from '@/components/Editor';

// Server-side fetch for initial data (using cookie session for RLS authorization)
async function getNote(id: string) {
    const supabase = await createServerSupabase();
    const { data } = await supabase.from('notes').select('*').eq('id', id).single();
    return data;
}

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const note = await getNote(id);
    if (!note) notFound();

    return <Editor noteId={note.id} initialNote={note} />;
}