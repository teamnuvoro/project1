
import { useState, useEffect } from 'react';
import Vapi from '@vapi-ai/web';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone, PhoneOff, Mic, MicOff, Loader2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Initialize Vapi SDK
// HARDCODED as requested to rule out env var issues
const VAPI_PUBLIC_KEY = 'dddc9544-777b-43d8-98dc-97ecb344e57f';
const vapi = new Vapi(VAPI_PUBLIC_KEY);

interface RiyaVoiceCallProps {
  userId: string;
  onCallEnd?: () => void;
}

export default function RiyaVoiceCall({ userId, onCallEnd }: RiyaVoiceCallProps) {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected" | "started" | "ended">("disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const [serverUrl, setServerUrl] = useState<string>(() => {
    // Priority: Local Storage -> Hardcoded fallback (User's URL) -> Env Var -> Empty
    return localStorage.getItem('riya_ngrok_url') || 'https://prosurgical-nia-carpingly.ngrok-free.dev';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Vapi Event Listeners
    vapi.on("call-start", () => {
      console.log("Vapi Call Started");
      setStatus("connected");
    });

    vapi.on("call-end", () => {
      console.log("Vapi Call Ended");
      setStatus("disconnected");
      if (onCallEnd) onCallEnd();
    });

    vapi.on("speech-start", () => console.log("User started speaking"));
    vapi.on("speech-end", () => console.log("User stopped speaking"));

    vapi.on("volume-level", (volume) => {
      // Optional: Visualize volume
    });

    vapi.on("error", (error) => {
      console.error("Vapi Error Event:", error);
      setStatus("disconnected");
      // Don't show toast for every minor error, but log it
    });

    return () => {
      vapi.stop();
      vapi.removeAllListeners();
    };
  }, [onCallEnd, toast]);

  const saveServerUrl = (url: string) => {
    setServerUrl(url);
    localStorage.setItem('riya_ngrok_url', url);
  };

  const startCall = async () => {
    try {
      if (!serverUrl) {
        setIsSettingsOpen(true);
        toast({
          title: "Configuration Needed",
          description: "Please enter your Ngrok URL to connect Riya's brain.",
          variant: "default"
        });
        return;
      }

      setStatus("connecting");

      // Clean URL: remove trailing slash and ensure protocol
      let cleanUrl = serverUrl.trim().replace(/\/$/, '');
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = `https://${cleanUrl}`;
      }

      const fullApiUrl = `${cleanUrl}/api/vapi/chat`;
      console.log("Starting Vapi call with Server URL:", fullApiUrl);

      const transientAssistantConfig = {
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "en-US"
        },
        model: {
          provider: "custom-llm",
          url: fullApiUrl,
          messages: [
            {
              role: "system",
              content: "You are Riya, a helpful and flirtatious AI assistant."
            }
          ]
        },
        voice: {
          provider: "deepgram",
          voiceId: "aura-asteria-en"
        },
        metadata: {
          userId: userId
        }
      };

      console.log("Vapi Config:", JSON.stringify(transientAssistantConfig, null, 2));

      // Start with Transient Assistant (No Assistant ID required)
      await vapi.start(transientAssistantConfig as any);

    } catch (err) {
      console.error("Failed to start call:", err);
      setStatus("disconnected");
      toast({
        title: "Error",
        description: "Failed to start call. Check console for details.",
        variant: "destructive"
      });
    }
  };

  const endCall = () => {
    vapi.stop();
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    vapi.setMuted(newMutedState);
    setIsMuted(newMutedState);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-900/50 rounded-xl backdrop-blur-sm border border-gray-800 relative">
      <div className="absolute top-4 right-4">
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <Settings className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Voice Configuration</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Ngrok URL (Required)</label>
                <Input
                  placeholder="https://abc.ngrok-free.app"
                  value={serverUrl}
                  onChange={(e) => saveServerUrl(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-500">Run 'ngrok http 3000' and paste the URL here so Vapi can reach your local server.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-8 text-2xl font-bold text-white">Riya Voice Call</div>

      <div className="flex flex-col items-center gap-6">
        {/* Status Indicator */}
        {status === "connecting" && (
          <div className="flex items-center gap-2 text-yellow-400 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Connecting...</span>
          </div>
        )}

        {status === "connected" && (
          <div className="flex items-center gap-2 text-green-400 animate-pulse">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Live Connection</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-4">
          {status === "disconnected" || status === "ended" ? (
            <Button
              onClick={startCall}
              className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/20 transition-all hover:scale-105"
            >
              <Phone className="w-8 h-8 text-white" />
            </Button>
          ) : (
            <>
              <Button
                onClick={toggleMute}
                variant="secondary"
                className={`w-12 h-12 rounded-full ${isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-700 text-white'}`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              <Button
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20 transition-all hover:scale-105"
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Helper Text */}
      <div className="mt-6 text-sm text-gray-400 text-center max-w-xs">
        {status === "connected"
          ? "Riya is listening. Speak naturally."
          : "Tap the phone icon. Configuring server URL helps Riya respond."}
      </div>
    </div>
  );
}
