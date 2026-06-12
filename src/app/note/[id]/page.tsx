import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Editor from '@/components/Editor';

// Server-side fetch for initial data (good for SEO + no loading flicker)
async function getNote(id: string) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.from('notes').select('*').eq('id', id).single();
    return data;
}

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const note = await getNote(id);
    if (!note) notFound();

    return <Editor noteId={note.id} initialNote={note} />;
}