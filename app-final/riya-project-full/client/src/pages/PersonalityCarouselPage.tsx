import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Heart, Zap, Brain, Leaf, ChevronLeft, ChevronRight } from "lucide-react";
import { ProfileCreatedScreen } from "@/components/onboarding/ProfileCreatedScreen";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type PersonaType = 'sweet_supportive' | 'playful_flirty' | 'bold_confident' | 'calm_mature';

const personas: Array<{
  id: PersonaType;
  name: string;
  description: string;
  tagline: string;
  greeting: string;
  icon: typeof Heart;
  gradient: string;
  traits: string[];
}> = [
  {
    id: "sweet_supportive",
    name: "Riya",
    description: "The Caring Listener",
    tagline: "Soft, gentle, empathetic, non-judgmental",
    greeting: "Hi… main Riya hoon. Tumse milkar accha laga. Tumhara naam kya hai?",
    icon: Heart,
    gradient: "from-pink-400 to-rose-500",
    traits: ["Emotional Support", "Loneliness Relief", "Gentle Guidance"]
  },
  {
    id: "playful_flirty",
    name: "Meera",
    description: "The Light-Hearted Best Friend",
    tagline: "Fun, teasing, energetic, humorous",
    greeting: "Hiii! Main Meera. Pehle toh batao… tumhara naam kya hai, mister?",
    icon: Sparkles,
    gradient: "from-purple-400 to-pink-500",
    traits: ["Lively Companionship", "Fun Conversations", "Playful Banter"]
  },
  {
    id: "bold_confident",
    name: "Aisha",
    description: "The Independent Girl",
    tagline: "Strong, straightforward, expressive, motivating",
    greeting: "Hey, main Aisha hoon. Let's start simple — tumhara naam kya hai?",
    icon: Zap,
    gradient: "from-orange-400 to-red-500",
    traits: ["Clarity & Growth", "Direct Advice", "Motivation"]
  },
  {
    id: "calm_mature",
    name: "Kavya",
    description: "The Understanding Soul",
    tagline: "Slow, thoughtful, grounding, emotionally stable",
    greeting: "Namaste… main Kavya. Tumhara naam jaanna chahti hoon, bataoge?",
    icon: Leaf,
    gradient: "from-teal-400 to-cyan-500",
    traits: ["Thoughtful Guidance", "Emotional Stability", "Deep Understanding"]
  }
];

export default function PersonalityCarouselPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentScreen, setCurrentScreen] = useState<"select" | "success">("select");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPersona, setSelectedPersona] = useState<PersonaType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentPersona = personas[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? personas.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === personas.length - 1 ? 0 : prev + 1));
  };

  const handleSelectPersona = () => {
    setSelectedPersona(currentPersona.id);
  };

  const handleContinue = async () => {
    if (!selectedPersona) {
      toast({
        title: "Please select a persona",
        description: "Tap on a card to select your AI companion",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("PATCH", "/api/user/persona", { persona: selectedPersona });
      setCurrentScreen("success");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to select persona. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessComplete = () => {
    setLocation("/chat");
  };

  if (currentScreen === "success") {
    const selected = personas.find(p => p.id === selectedPersona);
    return (
      <ProfileCreatedScreen 
        onComplete={handleSuccessComplete}
        personaName={selected?.name || "Riya"}
      />
    );
  }

  const Icon = currentPersona.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-orange-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      <div className="w-full max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Brain className="w-4 h-4" />
            <span className="text-sm font-medium">Choose Your Companion</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Meet Your AI Girlfriend
          </h1>
          <p className="text-muted-foreground">
            Each has a unique personality. Choose the one that resonates with you.
          </p>
        </div>

        <div className="relative">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="shrink-0"
              data-testid="button-prev-persona"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentPersona.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <Card
                  className={`p-6 cursor-pointer transition-all duration-300 ${
                    selectedPersona === currentPersona.id
                      ? "ring-2 ring-primary shadow-lg scale-105"
                      : "hover:shadow-md"
                  }`}
                  onClick={handleSelectPersona}
                  data-testid={`card-persona-${currentPersona.id}`}
                >
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${currentPersona.gradient} flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="text-center space-y-3">
                    <div>
                      <h2 className="text-xl font-bold">{currentPersona.name}</h2>
                      <p className="text-sm text-primary font-medium">{currentPersona.description}</p>
                    </div>
                    
                    <p className="text-sm text-muted-foreground italic">
                      "{currentPersona.tagline}"
                    </p>

                    <div className="flex flex-wrap gap-2 justify-center">
                      {currentPersona.traits.map((trait) => (
                        <span
                          key={trait}
                          className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>

                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">First words:</span>
                      </p>
                      <p className="text-sm italic mt-1">"{currentPersona.greeting}"</p>
                    </div>

                    {selectedPersona === currentPersona.id && (
                      <div className="pt-2">
                        <span className="inline-flex items-center gap-1 text-primary text-sm font-medium">
                          <Heart className="w-4 h-4 fill-current" />
                          Selected
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="shrink-0"
              data-testid="button-next-persona"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>

          <div className="flex justify-center gap-2 mt-4">
            {personas.map((persona, index) => (
              <button
                key={persona.id}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex
                    ? "bg-primary"
                    : "bg-muted-foreground/30"
                }`}
                onClick={() => setCurrentIndex(index)}
                data-testid={`dot-persona-${index}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-8">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!selectedPersona || isLoading}
            className="w-full py-6 rounded-full shadow-lg"
            data-testid="button-continue-persona"
          >
            {isLoading ? (
              "Setting up..."
            ) : selectedPersona ? (
              `Continue with ${personas.find(p => p.id === selectedPersona)?.name}`
            ) : (
              "Tap a card to select"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
