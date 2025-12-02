import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Palette, Lock, Unlock, Image as ImageIcon } from "lucide-react";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { AvatarDisplay } from "@/components/avatar/AvatarDisplay";
import { useToast } from "@/hooks/use-toast";
import { AvatarConfiguration, UnlockedContent } from "@shared/schema";

export default function GalleryPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: avatarConfig, isLoading: configLoading } = useQuery<AvatarConfiguration>({
        queryKey: ["avatarConfig"],
        queryFn: async () => {
            const res = await fetch("/api/avatar/config");
            if (!res.ok) throw new Error("Failed to fetch config");
            return res.json();
        },
    });

    const { data: unlocks, isLoading: unlocksLoading } = useQuery<UnlockedContent[]>({
        queryKey: ["unlocks"],
        queryFn: async () => {
            const res = await fetch("/api/unlocks");
            if (!res.ok) throw new Error("Failed to fetch unlocks");
            return res.json();
        },
    });

    const updateConfigMutation = useMutation({
        mutationFn: async (newConfig: Partial<AvatarConfiguration>) => {
            const res = await fetch("/api/avatar/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newConfig),
            });
            if (!res.ok) throw new Error("Failed to update config");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["avatarConfig"] });
            toast({
                title: "Style Updated",
                description: "Riya's look has been updated!",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to update style. Please try again.",
                variant: "destructive",
            });
        },
    });

    const handleConfigChange = (key: keyof AvatarConfiguration, value: string) => {
        updateConfigMutation.mutate({ [key]: value });
    };

    if (configLoading || unlocksLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background">
            <ChatHeader />

            <main className="flex-1 container max-w-4xl mx-auto p-4 overflow-y-auto">
                <div className="flex items-center gap-2 mb-6">
                    <Palette className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold">Riya's Gallery & Style</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Avatar Preview */}
                    <div className="md:col-span-1 space-y-4">
                        <Card className="overflow-hidden">
                            <CardHeader>
                                <CardTitle>Current Look</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="aspect-[3/4] relative">
                                    <AvatarDisplay
                                        className="h-full w-full"
                                    // We will pass config here once we update AvatarDisplay
                                    // For now it uses default or passed props
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Customization & Gallery */}
                    <div className="md:col-span-2">
                        <Tabs defaultValue="customize" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="customize">Customize Look</TabsTrigger>
                                <TabsTrigger value="gallery">Unlocked Memories</TabsTrigger>
                            </TabsList>

                            <TabsContent value="customize" className="space-y-4 mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Style Settings</CardTitle>
                                        <CardDescription>
                                            Customize how Riya appears to you.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Art Style</Label>
                                            <Select
                                                value={avatarConfig?.avatarStyle || "anime"}
                                                onValueChange={(v) => handleConfigChange("avatarStyle", v)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select style" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="anime">Anime Style</SelectItem>
                                                    <SelectItem value="realistic">Realistic</SelectItem>
                                                    <SelectItem value="semi_realistic">Semi-Realistic</SelectItem>
                                                    <SelectItem value="artistic">Artistic</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>



                                        <div className="space-y-2">
                                            <Label>Outfit</Label>
                                            <Select
                                                value={avatarConfig?.outfit || "casual"}
                                                onValueChange={(v) => handleConfigChange("outfit", v)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select outfit" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="casual">Casual Daywear</SelectItem>
                                                    <SelectItem value="date_night">Date Night</SelectItem>
                                                    <SelectItem value="traditional">Traditional</SelectItem>
                                                    <SelectItem value="winter">Winter Cozy</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="gallery" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Unlocked Content</CardTitle>
                                        <CardDescription>
                                            Special moments and photos you've unlocked.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {unlocks && unlocks.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-4">
                                                {unlocks.map((item) => (
                                                    <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                                                        {/* Placeholder for actual content */}
                                                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                                            <ImageIcon className="w-8 h-8" />
                                                        </div>
                                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-white text-xs">
                                                            Unlocked via {item.unlockMethod}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <Lock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                <p>No content unlocked yet.</p>
                                                <p className="text-sm">Keep chatting with Riya to unlock special memories!</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </main>
        </div>
    );
}
