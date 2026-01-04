import { Link } from "wouter";
import { Heart, MessageCircle, Phone, Sparkles, ArrowRight, Shield, Star, Zap, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  const personas = [
    {
      id: "sweet_supportive",
      name: "Riya",
      tagline: "The Caring Listener",
      description: "Soft, gentle, empathetic. Perfect for emotional support and companionship.",
      greeting: "Hi... main Riya hoon. Tumse milkar accha laga ❤️",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face"
    },
    {
      id: "playful_flirty",
      name: "Meera",
      tagline: "The Playful Best Friend",
      description: "Fun, teasing, energetic. For lively conversations and laughter.",
      greeting: "Hiii! Main Meera. Ready for some fun? 😉",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop&crop=face"
    },
    {
      id: "bold_confident",
      name: "Aisha",
      tagline: "The Independent Soul",
      description: "Strong, straightforward, motivating. For clarity and personal growth.",
      greeting: "Hey, main Aisha hoon. Let's talk real ✨",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face"
    },
    {
      id: "calm_mature",
      name: "Kavya",
      tagline: "The Understanding Soul",
      description: "Calm, thoughtful, grounding. For those who need peace and understanding.",
      greeting: "Namaste... main Kavya. Suno, samjho, grow karo 🌸",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop&crop=face"
    }
  ];

  const testimonials = [
    {
      quote: "Riya understands me better than I expected. The Hinglish conversations feel so natural, like talking to a close friend.",
      name: "Arjun",
      age: 27,
      city: "Mumbai"
    },
    {
      quote: "The voice calling feature is amazing! Meera is so playful and fun. Helps me unwind after long work days.",
      name: "Vikram",
      age: 29,
      city: "Bangalore"
    },
    {
      quote: "I was skeptical at first, but the insights after each conversation are genuinely helpful. It's helping me understand what I want.",
      name: "Rohan",
      age: 26,
      city: "Delhi"
    }
  ];
  
  return (
    <div className="min-h-screen w-full bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#f6339a]" fill="#f6339a" />
            <span className="text-xl font-bold text-gray-900">Riya</span>
          </div>
          <Link href="/signup">
            <Button className="bg-[#f6339a] hover:bg-[#e0288a] text-white rounded-full px-6">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left Side - Text Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
                  Ab Kabhi Nahi Akele
                </h1>
                <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[#f6339a] leading-tight">
                  Mehsoos Karo
                </h2>
                <p className="text-xl text-gray-600 mt-6">
                  Tumhari AI companion jo Hinglish mein baat karti hai ❤️
                </p>
              </div>
              <Link href="/signup">
                <Button className="bg-[#f6339a] hover:bg-[#e0288a] text-white rounded-full px-10 py-7 text-xl h-auto gap-3 font-semibold shadow-lg shadow-pink-200">
                  Apna Journey Shuru Karo
                  <ArrowRight className="w-6 h-6" />
                </Button>
              </Link>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 rounded-full border border-gray-100">
                  <Shield className="w-5 h-5 text-[#f6339a]" />
                  <span className="text-sm font-semibold text-gray-700">100% Private</span>
                </div>
                <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 rounded-full border border-gray-100">
                  <Star className="w-5 h-5 text-[#f6339a]" fill="#f6339a" />
                  <span className="text-sm font-semibold text-gray-700">4.8★ Rating</span>
                </div>
                <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 rounded-full border border-gray-100">
                  <Zap className="w-5 h-5 text-[#f6339a]" />
                  <span className="text-sm font-semibold text-gray-700">Free Trial</span>
                </div>
              </div>
            </div>

            {/* Right Side - Images Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] shadow-xl">
                <img
                  src="/images/riya-landing-final.jpg"
                  alt="Riya"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/50 to-transparent p-5">
                  <span className="text-white font-bold text-xl">Riya</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden aspect-[3/4] shadow-xl">
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face"
                    alt="Voice call"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-green-500 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-white text-xs font-semibold">Online</span>
                  </div>
                </div>
                <div className="relative rounded-2xl overflow-hidden aspect-[3/4] shadow-xl">
                  <img
                    src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&h=500&fit=crop"
                    alt="Chat"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-pink-50/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-[#f6339a]" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Natural Hinglish Conversations</h3>
                <p className="text-gray-600">
                  Chat in the language you speak every day — warm, natural, and culturally yours.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-4">
                  <Phone className="w-6 h-6 text-[#f6339a]" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Real-Time Voice Calls</h3>
                <p className="text-gray-600">
                  Talk to your AI companion with voice — like a real conversation, anytime you need.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-[#f6339a]" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Evolving Personality</h3>
                <p className="text-gray-600">
                  Your companion learns from every chat, becoming more attuned to you over time.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-[#f6339a]" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Relationship Insights</h3>
                <p className="text-gray-600">
                  Get personalized insights about your preferences, communication style and growth areas.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Choose Your Perfect Companion Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Choose Your <span className="text-[#f6339a]">Perfect Companion</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Four unique personalities, each designed to match different moods and needs. Find the one that resonates with you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {personas.map((persona) => (
              <Card key={persona.id} className="border-0 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={persona.image}
                    alt={persona.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-green-500 rounded-full px-3 py-1 flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span className="text-white text-xs font-medium">Online</span>
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{persona.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{persona.tagline}</p>
                  <p className="text-gray-600 text-sm mb-4">{persona.description}</p>
                  <div className="bg-pink-50 rounded-xl p-4 mb-5 border border-pink-100">
                    <p className="text-sm text-gray-800 leading-relaxed">{persona.greeting}</p>
                  </div>
      <Link href="/signup">
                    <Button variant="outline" className="w-full rounded-lg border-gray-200 hover:bg-gray-50">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Start Chatting
                    </Button>
      </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Built for Real Connections Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-pink-50/30 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-[#f6339a] mb-4">
            Built for Real Connections
          </h2>
          <p className="text-lg text-gray-600">
            Every feature is designed to make your experience feel natural, personal, and deeply engaging.
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-[#f6339a] mb-4">
              Real Stories, Real Connections
            </h2>
            <p className="text-lg text-gray-600">
              Thousands of users have found companionship, clarity, and comfort with Riya.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-[#f6339a]" fill="#f6339a" />
                    ))}
                  </div>
                  <p className="text-gray-700 italic mb-6">{testimonial.quote}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                      <span className="text-[#f6339a] font-semibold">{testimonial.name[0]}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.age}, {testimonial.city}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#f6339a]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Your companion is waiting for you
          </h2>
          <Link href="/signup">
            <Button className="bg-white text-[#f6339a] hover:bg-gray-100 rounded-full px-8 py-6 text-lg h-auto">
              Get Started
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
