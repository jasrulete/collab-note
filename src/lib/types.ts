export type Note = {
    id: string;
    title: string;
    content: string;
    version: number;
    created_at: string;
    updated_at: string;
};

// A connected user's presence data
export type PresenceUser = {
    userId: string;       // random UUID generated client-side
    name: string;         // user-chosen display name
    color: string;        // auto-assigned color from PRESENCE_COLORS
    cursorPosition: number; // character index in textarea
    selectionStart: number;
    selectionEnd: number;
    lastSeen: number;     // timestamp for stale detection
};

// Payload broadcast over Realtime for content changes
export type ContentBroadcast = {
    content: string;
    title: string;
    senderId: string;
    version: number;      // version this edit is based on
};

// Conflict detected when two users save at the same version
export type ConflictInfo = {
    localContent: string;
    serverContent: string;
    serverVersion: number;
};

export const PRESENCE_COLORS = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // amber
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
];
