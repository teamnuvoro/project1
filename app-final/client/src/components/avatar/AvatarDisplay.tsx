import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { UserEmotionalState, AvatarConfiguration } from "@shared/schema";

interface AvatarDisplayProps {
    emotionalState?: UserEmotionalState;
    config?: AvatarConfiguration;
    className?: string;
}

// Placeholder colors for emotions until we have real images
const emotionColors: Record<string, string> = {
    neutral: "bg-purple-100",
    happy: "bg-yellow-100",
    excited: "bg-orange-100",
    caring: "bg-pink-100",
    flirty: "bg-rose-200",
    sad: "bg-blue-100",
    thinking: "bg-indigo-100",
    stressed: "bg-red-100",
    calm: "bg-teal-100",
    anxious: "bg-slate-200",
};

// Placeholder emojis for emotions
const emotionEmojis: Record<string, string> = {
    neutral: "😊",
    happy: "😄",
    excited: "🤩",
    caring: "🥰",
    flirty: "😉",
    sad: "😢",
    thinking: "🤔",
    stressed: "😣",
    calm: "😌",
    anxious: "😰",
};

// Style modifiers (just for demo)
const styleModifiers: Record<string, string> = {
    anime: "brightness-110 contrast-125",
    realistic: "brightness-90 contrast-100",
    semi_realistic: "sepia-[.3]",
    artistic: "hue-rotate-15",
};

export function AvatarDisplay({ emotionalState, config, className = "" }: AvatarDisplayProps) {
    const [currentMood, setCurrentMood] = useState<string>("neutral");

    useEffect(() => {
        if (emotionalState?.mood) {
            setCurrentMood(emotionalState.mood);
        }
    }, [emotionalState]);

    const bgColor = emotionColors[currentMood] || emotionColors.neutral;
    const emoji = emotionEmojis[currentMood] || emotionEmojis.neutral;

    // Apply style based on config
    const styleClass = config?.avatarStyle ? styleModifiers[config.avatarStyle] || "" : "";

    return (
        <div className={`relative w-full h-64 flex items-center justify-center overflow-hidden transition-colors duration-500 ${bgColor} ${className}`}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentMood}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`text-9xl filter drop-shadow-xl cursor-pointer hover:scale-110 transition-transform duration-300 ${styleClass}`}
                    whileTap={{ scale: 0.95 }}
                >
                    {emoji}
                </motion.div>
            </AnimatePresence>

            {/* Status Badge */}
            <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-muted-foreground shadow-sm">
                    {currentMood.charAt(0).toUpperCase() + currentMood.slice(1)}
                </div>
                {config?.outfit && (
                    <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-primary shadow-sm">
                        Outfit: {config.outfit.replace('_', ' ')}
                    </div>
                )}
            </div>

            {/* Decorative Elements */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
        </div>
    );
}
