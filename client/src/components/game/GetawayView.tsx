import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';

interface Fragment {
    char: string;
    position: number;
    codeLength: number;
}

export function GetawayView() {
    const socket = useGameStore((s) => s.socket);
    const squadAdvance = useGameStore((s) => s.squadAdvance);
    const triggerSuccess = useGameStore((s) => s.triggerSuccess);
    const triggerError = useGameStore((s) => s.triggerError);
    const showSuccess = useGameStore((s) => s.showSuccess);
    const showError = useGameStore((s) => s.showError);

    const [code, setCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [myFragment, setMyFragment] = useState<Fragment | null>(null);
    const [codeLength, setCodeLength] = useState(4);

    // Request unique fragment from server
    useEffect(() => {
        if (socket && !myFragment) {
            socket.emit('get_fragment', (fragment: Fragment) => {
                console.log('[GETAWAY] Received fragment:', fragment);
                setMyFragment(fragment);
                if (fragment.codeLength) {
                    setCodeLength(fragment.codeLength);
                }
            });
        }
    }, [socket, myFragment]);

    // Listen for success from any player
    useEffect(() => {
        const handleComplete = (data: { view: string }) => {
            if (data.view === 'complete') {
                setCompleted(true);
                triggerSuccess();
            }
        };

        if (socket) {
            socket.on('view_change', handleComplete);
        }

        return () => {
            if (socket) {
                socket.off('view_change', handleComplete);
            }
        };
    }, [socket, triggerSuccess]);

    const handleSubmit = async () => {
        if (code.length !== codeLength || isSubmitting || completed) return;

        setIsSubmitting(true);

        // Verify code with server
        if (socket) {
            socket.emit('verify_code', { code: code.toUpperCase() }, (response: { success: boolean }) => {
                if (response.success) {
                    triggerSuccess();
                    setCompleted(true);

                    if (navigator.vibrate) {
                        navigator.vibrate([50, 50, 100, 50, 150]);
                    }

                    // Notify all players of success
                    setTimeout(() => {
                        squadAdvance('complete');
                    }, 1000);
                } else {
                    setWrongAttempts((prev) => prev + 1);
                    triggerError();

                    if (navigator.vibrate) {
                        navigator.vibrate([100, 50, 100, 50, 100]);
                    }
                }
                setIsSubmitting(false);
            });
        } else {
            setIsSubmitting(false);
        }
    };

    const handleKeyInput = (char: string) => {
        if (code.length < codeLength && !completed) {
            setCode((prev) => prev + char);
            if (navigator.vibrate) {
                navigator.vibrate(20);
            }
        }
    };

    const handleBackspace = () => {
        setCode((prev) => prev.slice(0, -1));
    };

    const keypad = [
        ['A', 'B', 'C', 'D'],
        ['E', 'F', 'G', 'H'],
        ['0', '1', '2', '3'],
        ['4', '5', '6', '7'],
        ['8', '9', 'I', 'J'],
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`min-h-screen bg-slate-900 cyber-grid p-4 flex flex-col ${showError ? 'shake' : ''}`}
        >
            {/* Success overlay */}
            <AnimatePresence>
                {(showSuccess || completed) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-green-500/30 flex items-center justify-center z-50"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 10 }}
                            className="text-center"
                        >
                            <p className="text-4xl mb-2">🚀</p>
                            <p className="text-green-400 text-2xl font-bold tracking-widest">
                                EXTRACTION CONFIRMED
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center mb-4"
            >
                <h1 className="text-2xl font-bold text-green-400 tracking-widest mb-2">
                    THE GETAWAY
                </h1>
                <p className="text-slate-400 text-sm">ENTER THE EXTRACTION CODE</p>
            </motion.div>

            {/* Code fragment display */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="cyber-card p-4 mb-4"
            >
                <p className="text-pink-400 text-xs uppercase tracking-wider mb-2 text-center">
                    YOUR FRAGMENT {myFragment ? `(POSITION ${myFragment.position})` : ''}:
                </p>
                <div className="flex justify-center">
                    {myFragment ? (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                            transition={{ delay: 0.2 }}
                            className="text-6xl font-bold text-cyan-400 font-mono glow-cyan"
                        >
                            {myFragment.char}
                        </motion.span>
                    ) : (
                        <span className="text-2xl text-slate-500 animate-pulse">Loading...</span>
                    )}
                </div>
                <p className="text-slate-500 text-xs mt-3 text-center">
                    Share your fragment with the squad!<br />
                    Each player has a different piece of the code.
                </p>
            </motion.div>

            {/* Hint box */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-yellow-500/10 border border-yellow-400/30 p-3 mb-4 text-center"
            >
                <p className="text-yellow-400 text-xs">
                    💡 The full code is {codeLength} characters. Ask each player for their fragment!
                </p>
            </motion.div>

            {/* Terminal Input Display */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-4"
            >
                <div className="bg-slate-800/80 border border-green-400/50 p-4 font-mono">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                        <span className="animate-pulse">▮</span>
                        <span className="text-xs">EXTRACTION TERMINAL</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <span className="text-slate-500">CODE:</span>
                        <div className="flex gap-1 ml-2 flex-wrap justify-center">
                            {Array.from({ length: codeLength }).map((_, i) => (
                                <motion.div
                                    key={i}
                                    className={`w-10 h-12 border-2 flex items-center justify-center text-xl font-bold
                                    ${code[i]
                                            ? 'border-green-400 text-green-400'
                                            : 'border-slate-600 text-slate-600'
                                        }`}
                                    animate={code[i] ? { scale: [1.1, 1] } : {}}
                                >
                                    {code[i] || '_'}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {wrongAttempts > 0 && (
                        <motion.p
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-red-400 text-xs mt-2"
                        >
                            ACCESS DENIED - ATTEMPT {wrongAttempts}
                        </motion.p>
                    )}
                </div>
            </motion.div>

            {/* Keypad */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex-1"
            >
                <div className="grid gap-2">
                    {keypad.map((row, rowIndex) => (
                        <div key={rowIndex} className="grid grid-cols-4 gap-2">
                            {row.map((char) => (
                                <motion.button
                                    key={char}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleKeyInput(char)}
                                    disabled={completed}
                                    className="py-3 text-xl font-bold bg-slate-800/50 border border-cyan-400/30 
                                     text-cyan-400 hover:bg-cyan-400/20 active:bg-cyan-400/30 transition-colors
                                     disabled:opacity-50"
                                >
                                    {char}
                                </motion.button>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Control buttons */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleBackspace}
                        disabled={completed}
                        className="py-3 text-lg font-bold bg-slate-800/50 border border-red-400/30 
                                   text-red-400 hover:bg-red-400/20 disabled:opacity-50"
                    >
                        ← DELETE
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSubmit}
                        disabled={code.length !== codeLength || isSubmitting || completed}
                        className="py-3 text-lg font-bold bg-green-500/20 border border-green-400 
                                   text-green-400 hover:bg-green-400/30 disabled:opacity-50"
                    >
                        {isSubmitting ? 'VERIFYING...' : 'EXECUTE ↵'}
                    </motion.button>
                </div>
            </motion.div>

            {/* Instructions */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-slate-500 text-xs mt-3"
            >
                Any player can enter the combined code
            </motion.p>
        </motion.div>
    );
}
