'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Note, PresenceUser, ContentBroadcast, ConflictInfo } from '@/lib/types';
import { PRESENCE_COLORS } from '@/lib/types';
import PresenceBar from './PresenceBar';
import ConflictModal from './ConflictModal';

// ─────────────────────────────────────────
// Editor Component
// ─────────────────────────────────────────

type Props = {
    noteId: string;
    initialNote: Note;
};

export default function Editor({ noteId, initialNote }: Props) {
    const router = useRouter();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentVersionRef = useRef(initialNote.version);

    const [me, setMe] = useState<{ userId: string; name: string; color: string } | null>(null);
    const [title, setTitle] = useState(initialNote.title);
    const [content, setContent] = useState(initialNote.content);
    const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
    const [conflict, setConflict] = useState<ConflictInfo | null>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [pendingLocal, setPendingLocal] = useState<{ content: string; title: string } | null>(null);

    // Get current authenticated user details
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                const name = user.email ? user.email.split('@')[0] : 'Collaborator';
                const charCodeSum = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const color = PRESENCE_COLORS[charCodeSum % PRESENCE_COLORS.length];
                setMe({
                    userId: user.id,
                    name,
                    color,
                });
            }
        });
    }, []);

    // ── Broadcast my cursor position ──────────────────
    const broadcastCursor = useCallback((pos: number, selStart: number, selEnd: number) => {
        if (!me) return;
        channelRef.current?.send({
            type: 'broadcast',
            event: 'cursor',
            payload: {
                userId: me.userId,
                name: me.name,
                color: me.color,
                cursorPosition: pos,
                selectionStart: selStart,
                selectionEnd: selEnd,
                lastSeen: Date.now(),
            } satisfies PresenceUser,
        });
    }, [me]);

    // ── Save to DB with conflict detection ────────────
    const saveToDb = useCallback(async (newContent: string, newTitle: string) => {
        if (!me) return;
        setSaveStatus('saving');

        const basedOnVersion = currentVersionRef.current;

        // Optimistic concurrency: only update if version matches
        const { data, error } = await supabase
            .from('notes')
            .update({
                content: newContent,
                title: newTitle,
                version: basedOnVersion + 1,
            })
            .eq('id', noteId)
            .eq('version', basedOnVersion) // ← conflict guard
            .select()
            .single();

        if (error || !data) {
            // Version mismatch → conflict! Fetch current server state.
            const { data: serverNote } = await supabase
                .from('notes')
                .select('content, title, version')
                .eq('id', noteId)
                .single();

            if (serverNote) {
                setConflict({
                    localContent: newContent,
                    serverContent: serverNote.content,
                    serverVersion: serverNote.version,
                });
                setPendingLocal({ content: newContent, title: newTitle });
                setSaveStatus('error');
            }
            return;
        }

        // Success → update local version reference
        currentVersionRef.current = data.version;
        setSaveStatus('saved');

        // Broadcast the change to other users
        channelRef.current?.send({
            type: 'broadcast',
            event: 'content',
            payload: {
                content: newContent,
                title: newTitle,
                senderId: me.userId,
                version: data.version,
            } satisfies ContentBroadcast,
        });
    }, [noteId, me]);

    // ── Debounced save (fires 800ms after last keystroke) ──
    const debouncedSave = useCallback((newContent: string, newTitle: string) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        setSaveStatus('saving');
        saveTimeoutRef.current = setTimeout(() => {
            saveToDb(newContent, newTitle);
        }, 800);
    }, [saveToDb]);

    // ── Set up Supabase Realtime channel ──────────────
    useEffect(() => {
        if (!me) return;

        const channel = supabase.channel(`note-${noteId}`, {
            config: {
                presence: { key: me.userId },
                broadcast: { self: false },
            },
        });

        // Listen for content broadcasts from other users
        channel.on('broadcast', { event: 'content' }, ({ payload }: { payload: ContentBroadcast }) => {
            if (payload.senderId === me.userId) return; // ignore our own echoes
            setContent(payload.content);
            setTitle(payload.title);
            currentVersionRef.current = payload.version;
        });

        // Listen for cursor broadcasts
        channel.on('broadcast', { event: 'cursor' }, ({ payload }: { payload: PresenceUser }) => {
            if (payload.userId === me.userId) return;
            setPresenceUsers(prev => {
                const exists = prev.find(u => u.userId === payload.userId);
                if (exists) {
                    return prev.map(u => u.userId === payload.userId ? payload : u);
                }
                return [...prev, payload];
            });
        });

        // Track who joins/leaves via Presence
        channel.on('presence', { event: 'join' }, ({ newPresences }) => {
            const joined = newPresences as unknown as PresenceUser[];
            setPresenceUsers(prev => {
                const incoming = joined.filter(j => j.userId !== me.userId && !prev.find(u => u.userId === j.userId));
                return [...prev, ...incoming];
            });
        });

        channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
            const left = leftPresences as unknown as PresenceUser[];
            const leftIds = left.map(u => u.userId);
            setPresenceUsers(prev => prev.filter(u => !leftIds.includes(u.userId)));
        });

        // Subscribe and track our own presence
        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    userId: me.userId,
                    name: me.name,
                    color: me.color,
                    cursorPosition: 0,
                    selectionStart: 0,
                    selectionEnd: 0,
                    lastSeen: Date.now(),
                } satisfies PresenceUser);
            }
        });

        channelRef.current = channel;

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            supabase.removeChannel(channel);
        };
    }, [noteId, me]);

    // ── Conflict resolution ──────────────────────────
    function resolveConflictKeepMine() {
        if (!pendingLocal) return;
        // Force-save our version by first updating to server version, then saving
        supabase.from('notes').select('version').eq('id', noteId).single().then(({ data }) => {
            if (data) {
                currentVersionRef.current = data.version;
                saveToDb(pendingLocal.content, pendingLocal.title);
            }
        });
        setConflict(null);
        setPendingLocal(null);
    }

    function resolveConflictAcceptServer() {
        if (!conflict) return;
        setContent(conflict.serverContent);
        currentVersionRef.current = conflict.serverVersion;
        setSaveStatus('saved');
        setConflict(null);
        setPendingLocal(null);
    }

    // ── Input handlers ────────────────────────────────
    function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        const newContent = e.target.value;
        setContent(newContent);
        debouncedSave(newContent, title);

        // Broadcast cursor immediately
        broadcastCursor(
            e.target.selectionStart,
            e.target.selectionStart,
            e.target.selectionEnd
        );
    }

    function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newTitle = e.target.value;
        setTitle(newTitle);
        debouncedSave(content, newTitle);
    }

    function handleTextareaSelect(e: React.SyntheticEvent<HTMLTextAreaElement>) {
        const el = e.currentTarget;
        broadcastCursor(el.selectionStart, el.selectionStart, el.selectionEnd);
    }

    // ── Save status indicator ─────────────────────────
    const statusLabel = {
        saved: '✓ Saved',
        saving: '● Saving…',
        error: '✕ Conflict',
    }[saveStatus];

    const statusColor = {
        saved: 'text-green-500',
        saving: 'text-yellow-400',
        error: 'text-red-400',
    }[saveStatus];

    if (!me) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400 text-sm">
                Connecting session…
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-950">
            {/* Toolbar */}
            <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900">
                <button
                    onClick={() => router.push('/')}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                    ← Back
                </button>

                <PresenceBar users={[
                    { userId: me.userId, name: me.name, color: me.color, cursorPosition: 0, selectionStart: 0, selectionEnd: 0, lastSeen: Date.now() },
                    ...presenceUsers
                ]} currentUserId={me.userId} />

                <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
            </header>

            {/* Editor */}
            <div className="flex-1 overflow-auto p-6 md:p-12">
                <div className="max-w-3xl mx-auto">
                    {/* Title */}
                    <input
                        ref={titleRef}
                        type="text"
                        value={title}
                        onChange={handleTitleChange}
                        placeholder="Note title…"
                        className="w-full text-3xl md:text-4xl font-bold bg-transparent border-none outline-none text-white placeholder-gray-700 mb-6 resize-none"
                    />

                    {/* Who else is here */}
                    {presenceUsers.length > 0 && (
                        <div className="flex gap-2 mb-4 flex-wrap">
                            {presenceUsers.map(user => (
                                <span
                                    key={user.userId}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                    style={{ backgroundColor: user.color + '33', border: `1px solid ${user.color}66` }}
                                >
                                    <span
                                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                                        style={{ backgroundColor: user.color }}
                                    />
                                    {user.name} is editing
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Content textarea */}
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleContentChange}
                        onSelect={handleTextareaSelect}
                        onKeyUp={handleTextareaSelect}
                        placeholder="Start writing… others will see your changes in real time."
                        className="w-full bg-transparent border-none outline-none text-gray-200 text-base leading-relaxed placeholder-gray-700 resize-none min-h-[60vh]"
                        style={{ caretColor: me.color }}
                    />
                </div>
            </div>

            {/* Conflict modal */}
            {conflict && (
                <ConflictModal
                    conflict={conflict}
                    onKeepMine={resolveConflictKeepMine}
                    onAcceptServer={resolveConflictAcceptServer}
                />
            )}
        </div>
    );
}