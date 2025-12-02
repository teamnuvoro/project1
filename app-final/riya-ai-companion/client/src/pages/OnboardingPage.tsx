import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Persona {
  id: string;
  name: string;
  trait: string;
  description: string;
  image: string;
}

const personas: Persona[] = [
  {
    id: "riya",
    name: "Riya",
    trait: "Empathetic & Caring",
    description: "Your warm companion who truly understands emotions and offers heartfelt advice.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face"
  },
  {
    id: "maya",
    name: "Maya",
    trait: "Bold & Confident",
    description: "A confident guide who helps you discover your true potential in relationships.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop&crop=face"
  },
  {
    id: "priya",
    name: "Priya",
    trait: "Playful & Fun",
    description: "A fun-loving companion who brings joy and lightness to every conversation.",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop&crop=face"
  }
];

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentPersona = personas[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % personas.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + personas.length) % personas.length);
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      toast({
        title: `Welcome!`,
        description: `${currentPersona.name} is ready to chat with you.`,
      });
      setLocation("/chat");
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-welcome flex flex-col px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Sparkles className="w-5 h-5 text-purple-600" />
        </div>
      </div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-onboarding-title">
          Choose Your<br />AI Assistant
        </h1>
        <p className="text-muted-foreground" data-testid="text-onboarding-subtitle">
          Swipe to explore different personalities
        </p>
      </motion.div>

      {/* Persona Carousel */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-full max-w-sm">
          {/* Navigation Arrows */}
          <button
            onClick={handlePrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
            data-testid="button-prev-persona"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
            data-testid="button-next-persona"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>

          {/* Persona Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPersona.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="persona-card bg-white"
            >
              {/* Image */}
              <div className="relative h-72 overflow-hidden">
                <img
                  src={currentPersona.image}
                  alt={currentPersona.name}
                  className="w-full h-full object-cover"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Name on Image */}
                <div className="absolute bottom-4 left-4 text-white">
                  <h2 className="text-2xl font-bold" data-testid="text-persona-name">
                    {currentPersona.name}
                  </h2>
                  <p className="text-sm text-white/90" data-testid="text-persona-trait">
                    {currentPersona.trait}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="p-5">
                <p className="text-muted-foreground text-center leading-relaxed" data-testid="text-persona-description">
                  {currentPersona.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Pagination Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {personas.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "w-6 bg-gray-800"
                    : "bg-gray-300"
                }`}
                data-testid={`button-dot-${index}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8"
      >
        <Button
          onClick={handleContinue}
          className="w-full h-14 text-lg rounded-full gradient-primary-button text-white shadow-lg shadow-purple-400/30"
          disabled={isLoading}
          data-testid="button-continue"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            `Continue with ${currentPersona.name}`
          )}
        </Button>
      </motion.div>
    </div>
  );
}
