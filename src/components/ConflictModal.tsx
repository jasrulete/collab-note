import type { ConflictInfo } from '@/lib/types';

type Props = {
    conflict: ConflictInfo;
    onKeepMine: () => void;
    onAcceptServer: () => void;
};

export default function ConflictModal({ conflict, onKeepMine, onAcceptServer }: Props) {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-yellow-600 rounded-xl max-w-2xl w-full p-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-yellow-400 text-xl">⚠</span>
                    <h2 className="text-white font-semibold text-lg">Edit Conflict Detected</h2>
                </div>
                <p className="text-gray-400 text-sm mb-5">
                    Another user saved changes while you were editing. Choose which version to keep:
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-blue-400 font-medium mb-2 uppercase tracking-wide">Your version</p>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap line-clamp-6">
                            {conflict.localContent || '(empty)'}
                        </p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-green-400 font-medium mb-2 uppercase tracking-wide">
                            Server version (v{conflict.serverVersion})
                        </p>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap line-clamp-6">
                            {conflict.serverContent || '(empty)'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onAcceptServer}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200 transition-colors"
                    >
                        Use server version
                    </button>
                    <button
                        onClick={onKeepMine}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium transition-colors"
                    >
                        Keep my version
                    </button>
                </div>
            </div>
        </div>
    );
}