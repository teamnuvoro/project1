import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Video, Phone, Mic, Send, Sparkles, ArrowLeft } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { AnalysisScreen } from "./AnalysisScreen";

interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  reaction?: string;
}

interface ChatScreenProps {
  aiName: string;
  aiImage: string;
  onBack?: () => void;
}

export function ChatScreen({ aiName, aiImage, onBack }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: `Hi! I'm ${aiName}. I'm here to help you with relationship guidance and understand your preferences. How are you feeling today?`,
      sender: "ai",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [userName, setUserName] = useState("User");
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [showTip, setShowTip] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickReplies = [
    "Mera current relationship confusing hai 💭",
    "Kaise pata chalega koi mujhe pasand karta hai?",
    "Main samajhna chahta hoon main kya dhundh raha hoon",
    "Mujhe dating advice chahiye"
  ];

  const conversationStarters = [
    "Kaise pata chalega koi mujhme interested hai?",
    "Main apni communication skills kaise improve kar sakta hoon?",
    "Long-term partner mein mujhe kya dekhna chahiye?",
    "Mujhe trust issues ho rahe hain",
    "Kaise pata chalega main relationship ke liye ready hoon?",
    "Healthy relationship kya hoti hai?"
  ];

  const dailyTip = {
    title: "💡 Today's Relationship Tip",
    text: "Active listening is crucial - don't just focus on replying, try to truly understand. Show empathy and validate feelings."
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        text: inputMessage,
        sender: "user",
        timestamp: new Date()
      };
      setMessages([...messages, newMessage]);
      setInputMessage("");
      setShowQuickReplies(false);

      // Show typing indicator
      setIsTyping(true);

      // Simulate AI response
      setTimeout(() => {
        setIsTyping(false);
        const aiResponse: Message = {
          id: messages.length + 2,
          text: "I understand. Tell me more about what's on your mind.",
          sender: "ai",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
        setShowQuickReplies(true);
      }, 2000);
    }
  };

  const handleQuickReply = (reply: string) => {
    setInputMessage(reply);
  };

  const handleReaction = (messageId: number, emoji: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, reaction: emoji } : msg
      )
    );
  };

  const handleRecordToggle = () => {
    setIsRecording(!isRecording);
    // Handle recording logic here
  };

  const handleAnalyzeType = () => {
    setShowAnalysis(true);
  };

  const handleVideoCall = () => {
    console.log("Starting video call...");
    // Handle video call logic
  };

  const handleAudioCall = () => {
    console.log("Starting audio call...");
    // Handle audio call logic
  };

  if (showAnalysis) {
    return (
      <AnalysisScreen 
        aiName={aiName}
        userName={userName}
        onClose={() => setShowAnalysis(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-400 to-pink-400 px-4 py-4 shadow-md">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-white">
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
            <ImageWithFallback
              src={aiImage}
              alt={aiName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-white">{aiName}</h2>
            <p className="text-white/80 text-sm">Online</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAudioCall}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
            >
              <Phone className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleVideoCall}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
            >
              <Video className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-purple-50/30 to-pink-50/30 relative">
        {/* WhatsApp-style background pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20c0-5.523 4.477-10 10-10s10 4.477 10 10c0 1.567-.362 3.047-1.006 4.365l8.485 8.485C49.047 32.362 50.527 32 52.092 32c5.523 0 10 4.477 10 10s-4.477 10-10 10c-1.565 0-3.045-.362-4.363-1.006l-8.485 8.485C39.638 60.953 40 62.433 40 64c0 5.523-4.477 10-10 10s-10-4.477-10-10c0-1.567.362-3.047 1.006-4.365l-8.485-8.485C11.047 51.638 9.567 52 8.002 52c-5.523 0-10-4.477-10-10s4.477-10 10-10c1.565 0 3.045.362 4.363 1.006l8.485-8.485C20.362 23.047 20 21.567 20 20z' fill='%23a855f7' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: '80px 80px',
            transform: 'rotate(-15deg) scale(1.5)',
            transformOrigin: 'center'
          }} />
        </div>
        
        {/* Messages content */}
        <div className="relative z-10 px-4 py-4">
          {/* Daily Tip Card */}
          {showTip && (
            <div className="mb-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 shadow-sm border border-purple-200">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-purple-800 font-semibold">{dailyTip.title}</h3>
                <button
                  onClick={() => setShowTip(false)}
                  className="text-purple-400 hover:text-purple-600 text-sm"
                >
                  ✕
                </button>
              </div>
              <p className="text-purple-700 text-sm leading-relaxed">{dailyTip.text}</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex mb-4 ${
                message.sender === "user" ? "justify-end pr-1" : "justify-start pl-2"
              }`}
            >
              <div className="relative group">
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    message.sender === "user"
                      ? "bg-purple-600 text-white rounded-tr-sm"
                      : "bg-white text-gray-800 shadow-md rounded-tl-sm"
                  }`}
                >
                  <p>{message.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === "user" ? "text-white/70" : "text-gray-500"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
                
                {/* Reaction on message */}
                {message.reaction && (
                  <div className="absolute -bottom-2 -right-2 bg-white rounded-full px-2 py-1 shadow-md text-sm">
                    {message.reaction}
                  </div>
                )}

                {/* Quick reaction buttons for AI messages */}
                {message.sender === "ai" && !message.reaction && (
                  <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white rounded-full shadow-lg px-2 py-1">
                    <button
                      onClick={() => handleReaction(message.id, "❤️")}
                      className="hover:scale-125 transition-transform"
                    >
                      ❤️
                    </button>
                    <button
                      onClick={() => handleReaction(message.id, "👍")}
                      className="hover:scale-125 transition-transform"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => handleReaction(message.id, "🙏")}
                      className="hover:scale-125 transition-transform"
                    >
                      🙏
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start mb-4">
              <div className="bg-white rounded-2xl px-4 py-3 shadow-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Analyze Button */}
      <div className="px-4 py-2 bg-purple-50">
        <Button
          onClick={handleAnalyzeType}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-full"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Analyze My Type
        </Button>
      </div>

      {/* Input Area */}
      <div className="px-4 py-4 bg-white border-t border-gray-200">
        {/* Quick Replies */}
        {showQuickReplies && messages.length <= 3 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {quickReplies.map((reply, index) => (
              <button
                key={index}
                onClick={() => handleQuickReply(reply)}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* Conversation Starters */}
        {messages.length > 3 && showQuickReplies && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">Need some ideas? Try these:</p>
            <div className="flex flex-wrap gap-2">
              {conversationStarters.slice(0, 2).map((starter, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickReply(starter)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 transition"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecordToggle}
            className={`p-3 rounded-full transition ${
              isRecording
                ? "bg-red-500 text-white animate-pulse"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 rounded-full border-2 border-gray-200 focus:border-purple-400 px-4"
          />
          <button
            onClick={handleSendMessage}
            className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}