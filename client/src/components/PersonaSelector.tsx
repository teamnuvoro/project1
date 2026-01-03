import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, Sparkles, Heart, Zap, Leaf } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

// Map old persona types to new persona IDs
const PERSONA_MAP: Record<string, string> = {
  'sweet_supportive': 'sweet_supportive',
  'playful_flirty': 'flirtatious',
  'bold_confident': 'dominant',
  'calm_mature': 'sweet_supportive', // Map to sweet_supportive
};

// Available personas with new system
const PERSONAS = [
  {
    id: 'sweet_supportive',
    name: 'Riya',
    description: 'The Caring Listener',
    icon: Heart,
    color: 'from-pink-400 to-rose-500',
    emoji: '💕'
  },
  {
    id: 'flirtatious',
    name: 'Meera',
    description: 'The Light-Hearted Best Friend',
    icon: Sparkles,
    color: 'from-purple-400 to-pink-500',
    emoji: '✨'
  },
  {
    id: 'playful',
    name: 'Sana',
    description: 'The Fun Companion',
    icon: Sparkles,
    color: 'from-yellow-400 to-orange-500',
    emoji: '🎉'
  },
  {
    id: 'dominant',
    name: 'Aisha',
    description: 'The Independent Girl',
    icon: Zap,
    color: 'from-orange-400 to-red-500',
    emoji: '💪'
  },
];

interface PersonaSelectorProps {
  currentPersona?: string;
  onPersonaChange?: (personaId: string) => void;
  compact?: boolean;
}

export function PersonaSelector({ currentPersona, onPersonaChange, compact = false }: PersonaSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Map current persona to new system
  const mappedPersonaId = currentPersona ? (PERSONA_MAP[currentPersona] || currentPersona) : 'sweet_supportive';
  const currentPersonaData = PERSONAS.find(p => p.id === mappedPersonaId) || PERSONAS[0];

  const personaMutation = useMutation({
    mutationFn: async (personaId: string) => {
      // Update user's persona in database
      await apiRequest("PATCH", "/api/user/persona", { 
        persona: personaId,
        userId: user?.id // Include userId in request
      });
      return personaId;
    },
    onSuccess: (personaId) => {
      toast({
        title: "Persona Changed! 🎭",
        description: `Switched to ${PERSONAS.find(p => p.id === personaId)?.name || personaId}`,
      });
      queryClient.invalidateQueries({ queryKey: ["user", user?.id] });
      if (onPersonaChange) {
        onPersonaChange(personaId);
      }
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to change persona",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectPersona = (personaId: string) => {
    if (personaId === mappedPersonaId) {
      setIsOpen(false);
      return;
    }
    personaMutation.mutate(personaId);
  };

  const Icon = currentPersonaData.icon;

  if (compact) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-white hover:bg-white/20"
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium">{currentPersonaData.name}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px] z-50 overflow-hidden"
            >
              {PERSONAS.map((persona) => {
                const PersonaIcon = persona.icon;
                const isSelected = persona.id === mappedPersonaId;
                return (
                  <button
                    key={persona.id}
                    onClick={() => handleSelectPersona(persona.id)}
                    disabled={personaMutation.isPending}
                    className={`w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 ${
                      isSelected ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${persona.color} flex items-center justify-center flex-shrink-0`}>
                      <PersonaIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">{persona.name}</div>
                      <div className="text-xs text-gray-500 truncate">{persona.description}</div>
                    </div>
                    {isSelected && (
                      <div className="text-purple-600 text-xs font-medium">✓</div>
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
        disabled={personaMutation.isPending}
      >
        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${currentPersonaData.color} flex items-center justify-center`}>
          <Icon className="w-3 h-3 text-white" />
        </div>
        <span>{currentPersonaData.name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[240px] z-50 overflow-hidden"
            >
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-1">
                  Choose Your AI Companion
                </div>
                {PERSONAS.map((persona) => {
                  const PersonaIcon = persona.icon;
                  const isSelected = persona.id === mappedPersonaId;
                  return (
                    <button
                      key={persona.id}
                      onClick={() => handleSelectPersona(persona.id)}
                      disabled={personaMutation.isPending}
                      className={`w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 rounded-lg ${
                        isSelected ? 'bg-purple-50 border-2 border-purple-500' : ''
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${persona.color} flex items-center justify-center flex-shrink-0`}>
                        <PersonaIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900">{persona.name}</div>
                        <div className="text-xs text-gray-500">{persona.description}</div>
                      </div>
                      {isSelected && (
                        <div className="text-purple-600 text-sm font-bold">✓</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

