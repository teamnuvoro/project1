"use client";

import { useState } from "react";
import { Lock, Unlock, Send, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { analytics } from "@/lib/analytics";

// Mock Data for the Gallery Item
const SNAP_DATA = {
    id: "snap-001",
    imageUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80",
    title: "A cozy evening... 🌙",
    price: 99,
};

export default function GalleryPage() {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [replyText, setReplyText] = useState("");
    const { toast } = useToast();

    const handleUnlock = () => {
        console.log("Payment Triggered for Snap:", SNAP_DATA.id);

        analytics.track('unlock_attempt', {
            item: SNAP_DATA.id,
            price: SNAP_DATA.price,
            source: 'gallery_blur'
        });

        // Simulate payment delay
        setTimeout(() => {
            setIsUnlocked(true);
            toast({
                title: "Memory Unlocked! 🔓",
                description: "You've unlocked a private moment with Riya.",
                duration: 3000,
            });
        }, 1000);
    };

    const handleSendReply = () => {
        if (!replyText.trim()) return;

        console.log("Reply sent:", replyText);
        setReplyText("");
        toast({
            title: "Reply Sent",
            description: "Riya will see your message!",
        });
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100 pb-20">
            <ChatHeader />

            <main className="flex-1 container max-w-5xl mx-auto p-4 md:p-6 space-y-6">
                {/* Header Section */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                        Riya's Private Snaps
                    </h1>
                    <div className="flex items-center gap-2 text-sm font-medium text-pink-300/80">
                        <Lock className="w-3.5 h-3.5" />
                        <span>1 Premium Photo Available</span>
                    </div>
                </div>

                {/* Gallery Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* The Main Locked Snap Card */}
                    <div className="relative group rounded-2xl overflow-hidden aspect-[3/4] shadow-2xl bg-gray-800 border border-gray-700/50">

                        {/* Background Image Wrapper */}
                        <div className="absolute inset-0 w-full h-full overflow-hidden">
                            <motion.img
                                src={SNAP_DATA.imageUrl}
                                alt="Locked Content"
                                className="w-full h-full object-cover"
                                initial={false}
                                animate={{
                                    filter: isUnlocked ? "blur(0px)" : "blur(16px)",
                                    scale: isUnlocked ? 1 : 1.05,
                                }}
                                transition={{ duration: 0.8, ease: "easeInOut" }}
                            />
                        </div>

                        {/* Overlay for Locked State */}
                        <AnimatePresence>
                            {!isUnlocked && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
                                >
                                    <div className="w-full max-w-[280px] bg-gray-900/90 border border-white/10 backdrop-blur-md rounded-xl p-6 flex flex-col items-center text-center gap-4 shadow-xl transform transition-all hover:scale-105 duration-300">
                                        <div className="p-3 bg-pink-500/20 rounded-full text-pink-400">
                                            <Lock className="w-6 h-6" />
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="font-semibold text-white text-lg">Unlock this memory</h3>
                                            <p className="text-xs text-gray-400">
                                                See what Riya is up to right now...
                                            </p>
                                        </div>

                                        <Button
                                            onClick={handleUnlock}
                                            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold border-0 shadow-lg shadow-pink-500/20"
                                        >
                                            Unlock for ₹{SNAP_DATA.price}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Content for Unlocked State (Chat Interface) */}
                        <AnimatePresence>
                            {isUnlocked && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent pt-12"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Reply to Riya..."
                                                className="bg-white/10 border-white/10 text-white placeholder-white/50 rounded-full pr-10 focus-visible:ring-pink-500 focus-visible:border-transparent backdrop-blur-md"
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="absolute right-1 top-1 h-8 w-8 text-pink-400 hover:text-pink-300 hover:bg-transparent"
                                                onClick={handleSendReply}
                                            >
                                                <Send className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Status Badge (Top Left) */}
                        <div className="absolute top-4 left-4">
                            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${isUnlocked
                                ? "bg-green-500/20 border-green-500/30 text-green-300"
                                : "bg-pink-500/20 border-pink-500/30 text-pink-300 animate-pulse"
                                }`}>
                                {isUnlocked ? "Unlocked" : "Premium"}
                            </div>
                        </div>

                    </div>

                    {/* Placeholder cards for future content grid layout */}
                    {[1, 2].map((i) => (
                        <div key={i} className="hidden md:flex rounded-2xl bg-gray-800/30 border border-gray-800 items-center justify-center text-gray-600 aspect-[3/4] border-dashed">
                            <div className="flex flex-col items-center gap-2">
                                <ImageIcon className="w-8 h-8 opacity-20" />
                                <span className="text-xs font-medium opacity-40">Coming Soon</span>
                            </div>
                        </div>
                    ))}

                </div>
            </main>
        </div>
    );
}
