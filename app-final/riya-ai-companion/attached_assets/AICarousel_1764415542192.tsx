import { useState, useRef, useEffect } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface AIAssistant {
  id: number;
  name: string;
  personality: string;
  description: string;
  image: string;
}

interface AICarouselProps {
  assistants: AIAssistant[];
  onSelectAI: (id: number) => void;
  selectedAI: number | null;
}

export function AICarousel({ assistants, onSelectAI, selectedAI }: AICarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onSelectAI(assistants[currentIndex].id);
  }, [currentIndex]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const cardWidth = scrollContainerRef.current.offsetWidth;
      const newIndex = Math.round(scrollLeft / cardWidth);
      setCurrentIndex(newIndex);
    }
  };

  return (
    <div className="relative w-full">
      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex overflow-x-scroll snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {assistants.map((ai, index) => (
          <div
            key={ai.id}
            className="flex-shrink-0 w-full snap-center flex items-center justify-center px-8"
          >
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-[320px]">
              {/* Image */}
              <div className="relative h-[400px]">
                <ImageWithFallback
                  src={ai.image}
                  alt={ai.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h2 className="text-2xl mb-1">{ai.name}</h2>
                  <p className="text-sm opacity-90">{ai.personality}</p>
                </div>
              </div>
              {/* Description */}
              <div className="p-6">
                <p className="text-gray-600 text-center">{ai.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-4">
        {assistants.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex
                ? "w-8 bg-white"
                : "w-2 bg-white/50"
            }`}
          />
        ))}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
