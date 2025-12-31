import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Mic, MicOff, Paperclip, Phone, Heart } from "lucide-react";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useToast } from "@/hooks/use-toast";
import { VoiceRecordingModal } from "@/components/VoiceRecordingModal";
import { Link } from "wouter";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  isMobile?: boolean;
  quickReplies?: string[];
  onQuickReply?: (reply: string) => void;
  failedMessage?: string;
}

const defaultQuickReplies = [
  "Mera current relationship confusing hai",
  "Kaise pata chalega koi mujhe pasand karta hai?",
  "Main kya dhundh raha hoon samajhna chahta hoon",
  "Mujhe dating advice chahiye",
  "Mujhe trust issues ho rahe hain",
  "Kaise pata chalega main relationship ready hoon?"
];

export function ChatInput({
  onSendMessage,
  isLoading,
  disabled,
  isMobile,
  quickReplies = defaultQuickReplies,
  onQuickReply,
  failedMessage
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { toast } = useToast();
  const {
    isRecording,
    transcript,
    error: speechError,
    startRecording,
    stopRecording,
    resetTranscript
  } = useSpeechToText();

  useEffect(() => {
    if (failedMessage) {
      setMessage(failedMessage);
    }
  }, [failedMessage]);

  // Update message when transcript is available
  useEffect(() => {
    if (transcript) {
      setMessage(prev => prev ? `${prev} ${transcript}` : transcript);
      setIsTranscribing(false);
      // Keep modal open to show transcript
    }
  }, [transcript]);

  // Show error toast if speech recognition fails
  useEffect(() => {
    if (speechError) {
      toast({
        title: "Recording Error",
        description: speechError,
        variant: "destructive",
      });
    }
  }, [speechError, toast]);

  const handleSend = () => {
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleQuickReply = (reply: string) => {
    if (onQuickReply) {
      onQuickReply(reply);
    } else {
      onSendMessage(reply);
    }
  };

  const handleMicClick = async () => {
    if (isRecording) {
      setIsTranscribing(true);
      await stopRecording();
    } else {
      setShowVoiceModal(true);
      await startRecording();
    }
  };

  const handleModalClose = async () => {
    if (isRecording) {
      setIsTranscribing(true);
      await stopRecording();
    } else {
      setShowVoiceModal(false);
      resetTranscript();
    }
  };

  const handleSendTranscript = () => {
    setShowVoiceModal(false);
    resetTranscript();
    // Message is already in the input, user can edit if needed
  };

  return (
    <>
      {/* Voice Recording Modal */}
      <VoiceRecordingModal
        isOpen={showVoiceModal}
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        transcript={transcript}
        onClose={handleModalClose}
        onSend={handleSendTranscript}
        onStartRecording={startRecording}
      />

      <div className="bg-white border-t border-gray-100 px-4 py-3 w-full">
        {/* Input Row - Paperclip, Input, Send Button */}
        <div className="flex items-center gap-2 w-full">
          {/* Paperclip icon on left */}
          <button
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
            title="Attach file"
            data-testid="button-attach"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Input field */}
          <div className="flex-1 min-w-0 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder={disabled ? "Limit Reached - Upgrade to Chat" : (isLoading ? "Sending..." : "Message Riya...")}
              disabled={isLoading || disabled}
              className={`w-full h-12 px-4 rounded-full text-sm focus:outline-none transition-all duration-300
                ${disabled
                  ? "bg-red-50 text-red-500 placeholder:text-red-400 font-semibold cursor-not-allowed border-2 border-red-100"
                  : "bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 disabled:opacity-50"
                }`}
              data-testid="input-chat-message"
            />
            {disabled && (
              <button
                onClick={() => {
                  const paywallEvent = new CustomEvent('openPaywall');
                  window.dispatchEvent(paywallEvent);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-yellow-900 text-xs font-bold rounded-full transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 whitespace-nowrap"
                data-testid="button-upgrade-in-input"
              >
                Upgrade
              </button>
            )}
          </div>

          {/* Pink send button */}
          <button
            onClick={handleSend}
            disabled={isLoading || disabled || !message.trim()}
            className="w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-50 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 disabled:hover:scale-100 flex-shrink-0"
            style={{ backgroundColor: '#FF69B4' }}
            data-testid="button-send-message"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Send className="h-5 w-5 text-white" />
            )}
          </button>
        </div>

        {/* Call Riya text with heart icon below - Centered */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <Link href="/call">
            <button className="flex items-center gap-1.5 transition-colors text-sm hover:opacity-80">
              <span style={{ color: '#FF69B4' }}>Call Riya</span>
              <Heart className="w-4 h-4" style={{ color: '#FF69B4', fill: '#FF69B4' }} />
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}
