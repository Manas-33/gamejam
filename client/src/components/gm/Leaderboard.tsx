import { motion, AnimatePresence } from 'framer-motion';

interface LeaderboardEntry {
    id: string;
    name: string;
    currentView: string;
    progressPercent: number;
    tasksCompleted: number;
    finishPosition: number | null;
    completedAt: number | null;
    playerCount: number;
    isComplete: boolean;
}

interface LeaderboardProps {
    entries: LeaderboardEntry[];
}

const SQUAD_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6',
];

export function Leaderboard({ entries }: LeaderboardProps) {
    return (
        <div className="bg-slate-800/50 border border-cyan-400/30 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-cyan-400 tracking-widest mb-6 text-center flex items-center justify-center gap-3">
                <span className="text-3xl">🏦</span>
                HEIST PROGRESS
                <span className="text-3xl">🏃</span>
            </h2>

            {/* Bank Map Header */}
            <div className="relative mb-4 bg-slate-900 rounded-lg p-4 border border-slate-700">
                <div className="flex justify-between text-xs text-slate-500 font-mono mb-2">
                    <span>ENTRANCE</span>
                    <span>SIGNAL JAMMER</span>
                    <span>VAULT</span>
                    <span>GETAWAY</span>
                    <span>EXIT 🚪</span>
                </div>
                <div className="h-3 bg-gradient-to-r from-slate-700 via-cyan-900 via-pink-900 via-amber-900 to-green-900 rounded-full relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-400 rounded-full" />
                    <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-400 rounded-full" />
                    <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-2 h-2 bg-pink-400 rounded-full" />
                    <div className="absolute left-3/4 top-1/2 -translate-y-1/2 w-2 h-2 bg-amber-400 rounded-full" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                </div>
            </div>

            {/* Leaderboard Entries */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {entries.map((entry, index) => {
                        const color = SQUAD_COLORS[index % SQUAD_COLORS.length];
                        
                        return (
                            <motion.div
                                key={entry.id}
                                layout
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 50 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className={`relative overflow-hidden rounded-lg ${
                                    entry.isComplete 
                                        ? 'border-2 border-green-400 shadow-lg shadow-green-400/20' 
                                        : 'border border-slate-600'
                                }`}
                            >
                                <div className="bg-slate-900/80 p-3">
                                    <div className="flex items-center gap-3 mb-2">
                                        {/* Position / Trophy */}
                                        <div 
                                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg"
                                            style={{ backgroundColor: entry.isComplete ? '#22c55e' : color }}
                                        >
                                            {entry.isComplete ? (
                                                entry.finishPosition === 1 ? '🏆' : 
                                                entry.finishPosition === 2 ? '🥈' : 
                                                entry.finishPosition === 3 ? '🥉' : 
                                                `#${entry.finishPosition}`
                                            ) : (
                                                index + 1
                                            )}
                                        </div>

                                        {/* Squad Name */}
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-white tracking-wider text-lg">
                                                    {entry.name}
                                                </span>
                                                <span className={`text-xs font-mono px-2 py-1 rounded ${
                                                    entry.isComplete 
                                                        ? 'bg-green-500/20 text-green-400' 
                                                        : 'bg-slate-700 text-slate-400'
                                                }`}>
                                                    {entry.isComplete 
                                                        ? 'ESCAPED!' 
                                                        : entry.currentView.toUpperCase().replace('_', ' ')
                                                    }
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-500">
                                                {entry.playerCount} operatives
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="relative h-8 bg-slate-700 rounded-lg overflow-hidden">
                                        {/* Background segments */}
                                        <div className="absolute inset-0 flex">
                                            <div className="flex-1 border-r border-slate-600" />
                                            <div className="flex-1 border-r border-slate-600" />
                                            <div className="flex-1 border-r border-slate-600" />
                                            <div className="flex-1" />
                                        </div>
                                        
                                        {/* Progress fill */}
                                        <motion.div
                                            className="absolute inset-y-0 left-0 rounded-lg"
                                            style={{ 
                                                background: entry.isComplete 
                                                    ? 'linear-gradient(90deg, #22c55e, #4ade80)' 
                                                    : `linear-gradient(90deg, ${color}, ${color}dd)`
                                            }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${entry.progressPercent}%` }}
                                            transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                                        />

                                        {/* Runner icon */}
                                        <motion.div
                                            className="absolute top-1/2 -translate-y-1/2 text-xl"
                                            initial={{ left: 0 }}
                                            animate={{ left: `calc(${Math.max(2, entry.progressPercent - 3)}%)` }}
                                            transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                                        >
                                            {entry.isComplete ? '🎉' : '🏃'}
                                        </motion.div>

                                        {/* Progress percentage */}
                                        <div className="absolute inset-0 flex items-center justify-end pr-3">
                                            <span className="text-sm font-bold text-white drop-shadow-lg">
                                                {Math.round(entry.progressPercent)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {entries.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4 animate-bounce">🏦</div>
                    <p className="text-slate-400 font-mono text-lg tracking-wider">
                        AWAITING SQUAD DEPLOYMENT...
                    </p>
                    <p className="text-slate-600 text-sm mt-2">
                        Teams will appear here once heist begins
                    </p>
                </div>
            )}
        </div>
    );
}
