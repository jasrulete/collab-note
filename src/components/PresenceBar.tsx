import type { PresenceUser } from '@/lib/types';

type Props = {
    users: PresenceUser[];
    currentUserId: string;
};

export default function PresenceBar({ users, currentUserId }: Props) {
    if (users.length === 0) return null;

    return (
        <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">Online:</span>
            <div className="flex -space-x-1">
                {users.map(user => (
                    <div
                        key={user.userId}
                        title={user.userId === currentUserId ? `${user.name} (you)` : user.name}
                        className="w-7 h-7 rounded-full border-2 border-gray-900 flex items-center justify-center text-xs font-bold text-white cursor-default"
                        style={{ backgroundColor: user.color }}
                    >
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                ))}
            </div>
            <span className="text-gray-500 text-xs">
                {users.length} {users.length === 1 ? 'person' : 'people'}
            </span>
        </div>
    );
}