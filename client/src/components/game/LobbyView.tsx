import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { useGameStore } from '../../store/useGameStore';
import { sfx } from '../../hooks/useSFX';

// Random prompts - visual/descriptive for identifying players
const PROMPTS = [
    "Describe your outfit today…",
    "What color are you wearing?",
    "Describe your hairstyle…",
    "What accessories are you wearing?",
    "What's the most noticeable thing about your look?",
    "Describe what you're wearing…",
    "What pattern or design is on your clothes?",
];

export function LobbyView() {
    const register = useGameStore((s) => s.register);
    const showError = useGameStore((s) => s.showError);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [nickname, setNickname] = useState('');
    const [tell, setTell] = useState('');
    const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [brushColor, setBrushColor] = useState('#22d3ee');
    const [brushSize, setBrushSize] = useState(2);

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size for mobile
        canvas.width = 280;
        canvas.height = 280;

        // Fill with dark background
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const getCoords = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();

        if ('touches' in e) {
            const touch = e.touches[0];
            return {
                x: (touch.clientX - rect.left) * (canvas.width / rect.width),
                y: (touch.clientY - rect.top) * (canvas.height / rect.height),
            };
        } else {
            return {
                x: (e.clientX - rect.left) * (canvas.width / rect.width),
                y: (e.clientY - rect.top) * (canvas.height / rect.height),
            };
        }
    }, []);

    const startDrawing = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        setHasDrawn(true);

        const { x, y } = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    }, [getCoords]);

    const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        if (!isDrawing) return;
        e.preventDefault();

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoords(e);

        ctx.lineTo(x, y);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }, [isDrawing, getCoords, brushColor, brushSize]);

    const stopDrawing = useCallback(() => {
        setIsDrawing(false);
    }, []);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    }, []);

    const handleSubmit = async () => {
        if (!nickname.trim() || !tell.trim() || !hasDrawn) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        setLoading(true);

        try {
            const drawing = canvas.toDataURL('image/png');
            await register({
                nickname: nickname.trim(),
                drawing,
                tell: tell.trim(),
                prompt,
            });
            sfx.success();
            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate([50, 50, 100]);
            }
        } catch (error) {
            console.error('Registration failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const colors = ['#22d3ee', '#f472b6', '#4ade80', '#fbbf24', '#f87171', '#ffffff'];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`min-h-screen bg-slate-900 cyber-grid p-4 flex flex-col ${showError ? 'shake' : ''}`}
        >
            {/* Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center mb-4"
            >
                <h1 className="text-2xl font-bold text-cyan-400 text-glow-cyan tracking-widest">
                    PROTOCOL: UNMASK
                </h1>
                <p className="text-slate-400 text-sm mt-1">IDENTITY REGISTRATION</p>
            </motion.div>

            {/* Nickname Input */}
            <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-4"
            >
                <label className="block text-cyan-400 text-xs mb-1 uppercase tracking-wider">
                    Codename
                </label>
                <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={20}
                    placeholder="Enter your alias..."
                    className="w-full bg-slate-800/50 border border-cyan-400/30 text-white px-4 py-3 
                     font-mono focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50
                     placeholder:text-slate-500"
                />
            </motion.div>

            {/* Canvas for Face Drawing */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-4"
            >
                <label className="block text-cyan-400 text-xs mb-1 uppercase tracking-wider">
                    Draw Yourself
                </label>
                <div className="relative">
                    <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full aspect-square border border-cyan-400/30 touch-none cursor-crosshair"
                        style={{ maxWidth: '280px', margin: '0 auto', display: 'block' }}
                    />

                    {/* Clear button */}
                    <button
                        onClick={clearCanvas}
                        className="absolute top-2 right-2 bg-slate-800/80 text-red-400 px-2 py-1 text-xs
                       border border-red-400/30 hover:bg-red-400/20"
                    >
                        CLEAR
                    </button>
                </div>

                {/* Color palette */}
                <div className="flex justify-center gap-2 mt-2">
                    {colors.map((color) => (
                        <button
                            key={color}
                            onClick={() => {
                                setBrushColor(color);
                                sfx.click();
                            }}
                            className={`w-8 h-8 rounded-full border-2 transition-transform ${brushColor === color ? 'border-white scale-110' : 'border-transparent'
                                }`}
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>

                {/* Brush size */}
                <div className="flex justify-center items-center gap-2 mt-2">
                    <span className="text-slate-500 text-xs">SIZE</span>
                    <input
                        type="range"
                        min="2"
                        max="20"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-24"
                    />
                </div>
            </motion.div>

            {/* Prompt and Tell */}
            <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-6"
            >
                <label className="block text-pink-400 text-xs mb-1 uppercase tracking-wider">
                    {prompt}
                </label>
                <textarea
                    value={tell}
                    onChange={(e) => setTell(e.target.value)}
                    maxLength={100}
                    placeholder="Complete the prompt..."
                    rows={2}
                    className="w-full bg-slate-800/50 border border-pink-400/30 text-white px-4 py-3 
                     font-mono focus:border-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-400/50
                     placeholder:text-slate-500 resize-none"
                />
                <span className="text-slate-500 text-xs">{tell.length}/100</span>
            </motion.div>

            {/* Submit Button */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-auto"
            >
                <Button
                    onClick={handleSubmit}
                    disabled={!nickname.trim() || !tell.trim() || !hasDrawn}
                    loading={loading}
                    size="lg"
                    className="w-full glow-cyan"
                >
                    REGISTER IDENTITY
                </Button>
            </motion.div>

            {/* Waiting indicator */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50"
                    >
                        <div className="text-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                                className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"
                            />
                            <p className="text-cyan-400 font-mono">UPLOADING IDENTITY...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
