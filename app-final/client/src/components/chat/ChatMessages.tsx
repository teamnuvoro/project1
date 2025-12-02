import { useState, useRef, useEffect } from "react";
import { type Message } from "@shared/schema";
import { ChatMessage } from "./ChatMessage";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Lightbulb } from "lucide-react";

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
  isMobile?: boolean;
  isTyping?: boolean;
}

export function ChatMessages({ messages, isLoading, isMobile, isTyping }: ChatMessagesProps) {
  const [showTip, setShowTip] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const dailyTip = {
    title: "Today's Relationship Tip",
    text: "Active listening is crucial - don't just focus on replying, try to truly understand. Show empathy and validate feelings."
  };

  const scrollToBottom = () => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsNearBottom(distanceFromBottom < 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className={`flex-1 overflow-y-auto ${isMobile ? 'px-3 py-4' : 'px-4 py-4'} bg-gradient-to-b from-purple-50/50 to-white`}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Relationship Tip Card */}
        {showTip && (
          <div className="tip-card mb-4 animate-bubble">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-amber-900 mb-1" data-testid="text-tip-title">
                    {dailyTip.title}
                  </h3>
                  <p className="text-sm text-amber-800/80 leading-relaxed" data-testid="text-tip-content">
                    {dailyTip.text}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTip(false)}
                className="flex-shrink-0 p-1 hover:bg-amber-200/50 rounded-full transition-colors"
                data-testid="button-close-tip"
              >
                <X className="w-4 h-4 text-amber-600" />
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {isLoading && messages.length === 0 ? (
          <div className="space-y-4 mt-4">
            <Skeleton className="h-16 w-3/4 rounded-2xl" />
            <Skeleton className="h-12 w-2/3 rounded-2xl ml-auto" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-16 h-16 rounded-full overflow-hidden mb-4 shadow-lg">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                alt="Riya"
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-empty-title">
              Start chatting with Riya
            </h3>
            <p className="text-muted-foreground text-sm" data-testid="text-empty-subtitle">
              Ask me anything about relationships!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start gap-3 animate-fade-in" data-testid="typing-indicator">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                alt="Riya"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">Riya is typing</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
