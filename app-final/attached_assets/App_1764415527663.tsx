import { Button } from "./components/ui/button";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import { useState } from "react";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Sparkles } from "lucide-react";
import { AICarousel } from "./components/AICarousel";
import { ChatScreen } from "./components/ChatScreen";
import { ProfileCreatedScreen } from "./components/ProfileCreatedScreen";

const aiAssistants = [
  {
    id: 1,
    name: "Riya",
    personality: "Empathetic & Caring",
    description: "Your warm companion who truly understands emotions and offers heartfelt advice.",
    image: "https://images.unsplash.com/photo-1758600587728-9bde755354ad?w=800&q=80"
  },
  {
    id: 2,
    name: "Priya",
    personality: "Confident & Motivating",
    description: "A strong presence who encourages you to be your best self in relationships.",
    image: "https://images.unsplash.com/photo-1739303987902-eccc301b09fc?w=800&q=80"
  },
  {
    id: 3,
    name: "Ananya",
    personality: "Elegant & Wise",
    description: "Sophisticated guidance with a touch of class for mature relationship insights.",
    image: "https://images.unsplash.com/photo-1760551937537-a29dbbfab30b?w=800&q=80"
  },
  {
    id: 4,
    name: "Maya",
    personality: "Fun & Adventurous",
    description: "Brings excitement and fresh perspectives to help you enjoy relationship journey.",
    image: "https://images.unsplash.com/photo-1732588958769-fe931aca1ef0?w=800&q=80"
  }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<"welcome" | "form" | "success" | "select" | "chat">("welcome");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const [selectedAI, setSelectedAI] = useState<number | null>(null);

  const handleGetStarted = () => {
    setCurrentScreen("form");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    setCurrentScreen("success");
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectAI = (id: number) => {
    setSelectedAI(id);
  };

  const handleContinueWithAI = () => {
    if (selectedAI) {
      console.log("Selected AI:", selectedAI);
      setCurrentScreen("chat");
    }
  };

  // Chat Screen
  if (currentScreen === "chat") {
    const selectedAssistant = aiAssistants.find(ai => ai.id === selectedAI);
    if (!selectedAssistant) return null;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        {/* Mobile Container */}
        <div className="w-full max-w-[430px] h-screen bg-white flex flex-col relative overflow-hidden">
          <ChatScreen
            aiName={selectedAssistant.name}
            aiImage={selectedAssistant.image}
            userName={formData.name || "User"}
            onBack={() => setCurrentScreen("select")}
          />
        </div>
      </div>
    );
  }

  // AI Selection Screen
  if (currentScreen === "select") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        {/* Mobile Container */}
        <div className="w-full max-w-[430px] h-screen bg-gradient-to-b from-pink-100 via-purple-100 to-orange-100 flex flex-col relative overflow-hidden">
          {/* Header */}
          <div className="text-center pt-12 pb-6 px-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <h1 className="text-3xl text-gray-800">Choose Your AI Assistant</h1>
            </div>
            <p className="text-gray-600">Swipe to explore different personalities</p>
          </div>

          {/* Carousel */}
          <div className="flex-1 flex items-center">
            <AICarousel 
              assistants={aiAssistants}
              onSelectAI={handleSelectAI}
              selectedAI={selectedAI}
            />
          </div>

          {/* Continue Button */}
          <div className="px-6 pb-8">
            <Button 
              size="lg"
              onClick={handleContinueWithAI}
              disabled={!selectedAI}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 rounded-full shadow-lg disabled:opacity-50 transition-colors"
            >
              Continue with {selectedAI ? aiAssistants.find(ai => ai.id === selectedAI)?.name : "AI"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (currentScreen === "form") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        {/* Mobile Container */}
        <div className="w-full max-w-[430px] h-screen bg-gradient-to-b from-pink-100 via-purple-100 to-orange-100 flex flex-col relative">
          {/* Form Screen - Removed excessive padding */}
          <div className="flex-1 flex flex-col px-6 py-8">
            {/* Avatar on top */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white rounded-full p-1 shadow-lg">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1758600587728-9bde755354ad?w=400&q=80"
                  alt="Riya AI"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>

            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-3xl text-purple-600 mb-2">Tell Us About Yourself</h1>
              <p className="text-gray-600">Share your details to start your journey</p>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-3xl shadow-xl p-6 flex-1 flex flex-col">
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="space-y-5 flex-1">
                  {/* Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700">Your Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                      className="h-12 border-2 border-gray-200 focus:border-purple-400 rounded-xl"
                    />
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                      className="h-12 border-2 border-gray-200 focus:border-purple-400 rounded-xl"
                    />
                  </div>

                  {/* Phone Field */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      required
                      className="h-12 border-2 border-gray-200 focus:border-purple-400 rounded-xl"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-6">
                  <Button 
                    type="submit"
                    size="lg"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 rounded-full shadow-lg transition-colors"
                  >
                    Submit
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentScreen === "success") {
    return (
      <ProfileCreatedScreen onComplete={() => setCurrentScreen("select")} />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      {/* Mobile Container */}
      <div className="w-full max-w-[430px] h-screen bg-gradient-to-b from-purple-200 via-pink-200 to-orange-200 flex flex-col relative">
        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-10">
          {/* Heart Icon */}
          <div className="w-32 h-32 bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center mb-8">
            <div className="w-24 h-24 bg-purple-500 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="text-center">
            <h1 className="text-4xl text-gray-800 mb-4">Welcome to Riya AI</h1>
            <p className="text-gray-700 leading-relaxed px-4">
              I'm here to help you understand relationships better and guide you toward meaningful companionship.
            </p>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="px-10 pb-10">
          <Button 
            size="lg"
            onClick={handleGetStarted}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white py-6 rounded-2xl shadow-lg transition-all"
          >
            Let's Get Started
          </Button>
          <p className="text-center text-gray-600 text-sm mt-4">
            Already have an account? <span className="underline cursor-pointer">Login</span>
          </p>
        </div>
      </div>
    </div>
  );
}