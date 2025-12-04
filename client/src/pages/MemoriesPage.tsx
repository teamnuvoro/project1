import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';
import { ArrowLeft, MessageCircle, Calendar, Clock, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday, isSameDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'ai';
  createdAt: string;
  sessionId: string;
}

interface GroupedMessages {
  date: Date;
  dateLabel: string;
  messages: Message[];
}

export default function MemoriesPage() {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Fetch all messages for the user
  const { data: messages = [], isLoading, error } = useQuery<Message[]>({
    queryKey: ['/api/messages/all'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/messages/all');
      return response.json();
    },
  });

  // Group messages by day
  const groupMessagesByDay = (messages: Message[]): GroupedMessages[] => {
    const grouped = new Map<string, Message[]>();

    messages.forEach((message) => {
      const messageDate = parseISO(message.createdAt);
      const dateKey = format(messageDate, 'yyyy-MM-dd');

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(message);
    });

    // Convert to array and sort by date (newest first)
    const result: GroupedMessages[] = Array.from(grouped.entries())
      .map(([dateKey, msgs]) => {
        const date = parseISO(dateKey);
        let dateLabel = format(date, 'MMMM d, yyyy');

        if (isToday(date)) {
          dateLabel = 'Today';
        } else if (isYesterday(date)) {
          dateLabel = 'Yesterday';
        }

        return {
          date,
          dateLabel,
          messages: msgs.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ),
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    return result;
  };

  const groupedMessages = groupMessagesByDay(messages);
  const totalMessages = messages.length;
  const totalDays = groupedMessages.length;

  const toggleDay = (dateKey: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDays(newExpanded);
  };

  // Auto-expand today by default
  useEffect(() => {
    if (groupedMessages.length > 0) {
      setExpandedDays(new Set([groupedMessages[0].dateLabel]));
    }
  }, [groupedMessages.length]);

  return (
    <div className="h-full w-full bg-gradient-to-b from-purple-50/30 via-pink-50/20 to-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-4 shadow-lg">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Link href="/chat">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-xl">Chat Memories</h1>
            <p className="text-white/90 text-sm">Your complete conversation history</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{totalMessages} messages</p>
            <p className="text-xs text-white/80">{totalDays} days</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
              <p className="text-gray-500">Loading your memories...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500">Failed to load messages</p>
              <p className="text-sm text-gray-400 mt-2">Please try again later</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No messages yet</h3>
              <p className="text-gray-500 text-center mb-4">
                Start chatting with Riya to create memories!
              </p>
              <Link href="/chat">
                <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold hover:shadow-lg transition-all">
                  Start Chatting
                </button>
              </Link>
            </div>
          ) : (
            groupedMessages.map((group, groupIndex) => {
              const isExpanded = expandedDays.has(group.dateLabel);
              const dateKey = group.dateLabel;

              return (
                <motion.div
                  key={dateKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIndex * 0.1 }}
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100"
                >
                  {/* Day Header - Clickable */}
                  <button
                    onClick={() => toggleDay(dateKey)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">{group.dateLabel}</h3>
                        <p className="text-sm text-gray-500">
                          {group.messages.length} messages
                        </p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-gray-400"
                    >
                      ▼
                    </motion.div>
                  </button>

                  {/* Messages - Expandable */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="border-t border-gray-100"
                      >
                        <div className="px-6 py-4 space-y-4 max-h-[500px] overflow-y-auto">
                          {group.messages.map((message, index) => {
                            const isUser = message.role === 'user';
                            const time = format(parseISO(message.createdAt), 'h:mm a');

                            return (
                              <motion.div
                                key={message.id}
                                initial={{ opacity: 0, x: isUser ? 20 : -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                              >
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                  {isUser ? (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white font-semibold text-sm">
                                      U
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-full overflow-hidden">
                                      <img
                                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                                        alt="Riya"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Message Bubble */}
                                <div className="flex-1 max-w-[75%]">
                                  <div
                                    className={`px-4 py-3 rounded-2xl ${
                                      isUser
                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-tr-sm'
                                        : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                                    }`}
                                  >
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                      {message.content}
                                    </p>
                                  </div>
                                  <div className={`flex items-center gap-1 mt-1 px-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">{time}</span>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
