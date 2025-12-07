"use client";

import { useState } from "react";
import { Lock, Unlock, Send, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { analytics } from "@/lib/analytics";
import { PaywallSheet } from "@/components/paywall/PaywallSheet";
import { useAuth } from "@/contexts/AuthContext";

// Mock Data for Gallery Items
const GALLERY_ITEMS = [
    {
        id: "snap-01",
        imageUrl: "/images/gallery/snap_01.jpg",
        title: "Morning Sun ☀️",
        price: 0,
        isFree: true,
    },
    {
        id: "snap-02",
        imageUrl: "/images/gallery/snap_02.jpg",
        title: "Beach Vibes 🌊",
        price: 99,
        isFree: false,
    },
    {
        id: "snap-03",
        imageUrl: "/images/gallery/snap_03.jpg",
        title: "Golden Hour ✨",
        price: 99,
        isFree: false,
    },
    {
        id: "snap-04",
        imageUrl: "/images/gallery/snap_04.jpg",
        title: "Sunset Glow 🌅",
        price: 149,
        isFree: false,
    },
];

export default function GalleryPage() {
    const [replyText, setReplyText] = useState("");
    const [showPaywall, setShowPaywall] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    // Check if user is already premium
    const isPremium = user?.premium_user || false;

    const handleUnlockAttempt = (item: typeof GALLERY_ITEMS[0]) => {
        if (item.isFree || isPremium) return;

        console.log("Unlock Triggered for Snap:", item.id);

        analytics.track('unlock_attempt', {
            item: item.id,
            price: item.price,
            source: 'gallery_blur'
        });

        setShowPaywall(true);
    };

    const handleSendReply = () => {
        if (!replyText.trim()) return;
        setReplyText("");
        toast({
            title: "Reply Sent",
            description: "Riya will see your message!",
        });
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100 pb-20">
            <ChatHeader hideAnalytics={true} />

            <main className="flex-1 container max-w-5xl mx-auto p-4 md:p-6 space-y-6">
                {/* Header Section */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                        Riya's Private Snaps
                    </h1>
                    <div className="flex items-center gap-2 text-sm font-medium text-pink-300/80">
                        <Lock className="w-3.5 h-3.5" />
                        <span>{isPremium ? "You have Full Access" : "3 Premium Photos available"}</span>
                    </div>
                </div>

                {/* Gallery Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 place-items-center">

                    {GALLERY_ITEMS.map((item, index) => {
                        const isUnlocked = item.isFree || isPremium;

                        return (
                            <div
                                key={item.id}
                                className="relative group rounded-2xl overflow-hidden aspect-[3/4] w-full max-w-md shadow-2xl bg-gray-800 border border-gray-700/50"
                            >
                                {/* Background Image Wrapper */}
                                <div className="absolute inset-0 w-full h-full overflow-hidden">
                                    <motion.img
                                        src={item.imageUrl}
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                        initial={false}
                                        animate={{
                                            filter: isUnlocked ? "blur(0px)" : "blur(20px)",
                                            scale: isUnlocked ? 1 : 1.1,
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
                                            className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-6 z-10"
                                        >
                                            <div className="w-full max-w-[280px] bg-gray-900/90 border border-white/10 backdrop-blur-xl rounded-xl p-6 flex flex-col items-center text-center gap-4 shadow-xl transform transition-all hover:scale-105 duration-300">
                                                <div className="p-3 bg-pink-500/20 rounded-full text-pink-400">
                                                    <Lock className="w-4 h-4" />
                                                </div>

                                                <div className="space-y-1">
                                                    <h3 className="font-semibold text-white text-lg">Private Memory</h3>
                                                    <p className="text-xs text-gray-400">
                                                        Unlock Premium to see this...
                                                    </p>
                                                </div>

                                                <Button
                                                    onClick={() => handleUnlockAttempt(item)}
                                                    className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold border-0 shadow-lg shadow-pink-500/20"
                                                >
                                                    Unlock Access
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Chat Interface for Unlocked Items */}
                                {isUnlocked && (
                                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent pt-12 z-20">
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <Input
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder={`Reply to ${item.title}...`}
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
                                    </div>
                                )}

                                {/* Status Badge */}
                                <div className="absolute top-4 left-4 z-20">
                                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${isUnlocked
                                        ? "bg-green-500/20 border-green-500/30 text-green-300"
                                        : "bg-pink-500/20 border-pink-500/30 text-pink-300 animate-pulse"
                                        }`}>
                                        {isUnlocked ? "Unlocked" : "Premium"}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            <PaywallSheet open={showPaywall} onOpenChange={setShowPaywall} />
        </div>
    );
}
