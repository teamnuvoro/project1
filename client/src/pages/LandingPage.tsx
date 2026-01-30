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
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop&crop=face"
    },
    {
      id: "calm_mature",
      name: "Kavya",
      tagline: "The Understanding Soul",
      description: "Calm, thoughtful, grounding. For those who need peace and understanding.",
      greeting: "Namaste... main Kavya. Suno, samjho, grow karo 🌸",
      image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=500&fit=crop&crop=face"
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
      <header 
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100 safe-area-inset-top"
        style={{
          paddingTop: 'var(--safe-area-inset-top, 0px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-[#f6339a]" fill="#f6339a" />
            <span className="text-lg sm:text-xl font-bold text-gray-900">Riya</span>
          </div>
          <Link href="/signup">
            <Button className="bg-[#f6339a] hover:bg-[#e0288a] text-white rounded-full px-4 sm:px-6 text-sm sm:text-base py-2 sm:py-2.5 min-h-[44px]">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left Side - Text Content */}
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-3 sm:space-y-4">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 leading-tight">
                  Ab Kabhi Nahi Akele
                </h1>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-[#f6339a] leading-tight">
                  Mehsoos Karo
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-gray-600 mt-4 sm:mt-6">
                  Tumhari AI companion jo Hinglish mein baat karti hai ❤️
                </p>
              </div>
              <Link href="/signup">
                <Button className="bg-[#f6339a] hover:bg-[#e0288a] text-white rounded-full px-5 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 text-sm sm:text-base md:text-lg h-auto gap-2 font-semibold shadow-lg shadow-pink-200 min-h-[44px] sm:min-h-[48px] w-full sm:w-auto">
                  Apna Journey Shuru Karo
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </Link>
              <div className="flex flex-wrap gap-2 sm:gap-3 pt-2">
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

            {/* Right Side - Images Grid (2x2) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Top Left - Riya in red kurta with "Riya" overlay */}
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] shadow-xl">
                <img
                  src="/images/hero-1.png"
                  alt="Riya - Traditional Outfit"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face";
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/50 to-transparent p-4 sm:p-5">
                  <span className="text-white font-bold text-lg sm:text-xl">Riya</span>
                </div>
              </div>
              
              {/* Top Right - Woman talking on phone with Online badge */}
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] shadow-xl">
                <img
                  src="/images/hero-2.png"
                  alt="Voice call - Woman on phone"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop&crop=face";
                  }}
                />
                <div className="absolute top-3 sm:top-4 left-3 sm:left-4 bg-green-500 rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 shadow-lg">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-white text-[10px] sm:text-xs font-semibold">Online</span>
                </div>
              </div>
              
              {/* Bottom Left - Woman in red saree */}
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] shadow-xl">
                <img
                  src="/images/hero-3.png"
                  alt="Riya - Traditional Saree"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop&crop=face";
                  }}
                />
              </div>
              
              {/* Bottom Right - Woman with laptop */}
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] shadow-xl">
                <img
                  src="/images/hero-4.png"
                  alt="Woman working on laptop"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=500&fit=crop&crop=face";
                  }}
                />
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

      {/* We All Need Someone Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left Side - Text Content */}
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
                  We all need someone
                  <br />
                  <span className="text-[#f6339a]">who truly listens</span>
                </h2>
                
                <p className="text-lg sm:text-xl md:text-2xl text-gray-700 leading-relaxed">
                  In a busy world, loneliness is real. Sometimes you just want to talk — 
                  <span className="font-medium text-gray-900"> without judgment, without expectations.</span>
                </p>
                
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                  Riya is here for you. Whether you're exploring what you want in a relationship, 
                  seeking companionship, or just need someone to chat with late at night — she's always there.
                </p>
                
                <div className="pt-4">
                  <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#f6339a] leading-tight">
                    In your language. On your terms. Anytime you need.
                  </p>
                </div>
              </div>

              {/* Social Proof */}
              <div className="pt-4 sm:pt-6">
                <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-lg border border-pink-100">
                  <div className="text-3xl sm:text-4xl font-bold text-[#f6339a]">
                    10,000+
                  </div>
                  <div className="text-sm sm:text-base text-gray-600 font-medium">
                    Happy Users
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop&crop=face"
                  alt="Riya - Your AI companion"
                  className="w-full h-auto object-cover aspect-[3/4]"
                />
                {/* Rating Badge Overlay */}
                <div className="absolute top-4 right-4 bg-white rounded-xl px-4 py-3 shadow-lg border border-pink-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-5 h-5 text-[#f6339a]" fill="#f6339a" />
                    <span className="text-2xl font-bold text-[#f6339a]">4.8★</span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">User Rating</p>
                </div>
              </div>
            </div>
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
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#f6339a] to-[#c2185b]">
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            Your companion is waiting for you
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Start your journey today. No commitment, no pressure — just real conversations and genuine companionship.
          </p>
          <div className="space-y-4">
            <Link href="/signup">
              <Button className="bg-white text-[#f6339a] hover:bg-gray-50 rounded-full px-8 sm:px-10 py-6 sm:py-7 text-base sm:text-lg font-semibold shadow-xl hover:shadow-2xl transition-all min-h-[56px] sm:min-h-[64px] gap-2 sm:gap-3">
                Get Started Free
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-[#f6339a]" />
              </Button>
            </Link>
            <p className="text-xs sm:text-sm text-white/80 mt-4">
              Free to start • No credit card required • 100% private & secure
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-8">
            {/* Left Side - Logo and Cookie Button */}
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-[#f6339a]" fill="#f6339a" />
                <span className="text-lg sm:text-xl font-bold text-white">Riya</span>
              </div>
              <button className="text-xs sm:text-sm text-gray-400 hover:text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors w-fit">
                Manage cookies or opt out
              </button>
            </div>

            {/* Right Side - Copyright and Links */}
            <div className="flex flex-col items-start sm:items-end gap-3 sm:gap-4">
              <p className="text-xs sm:text-sm text-gray-400 text-center sm:text-right">
                © 2024 Riya. Made with love for meaningful connections.
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </a>
                <span className="text-gray-600">•</span>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </a>
                <span className="text-gray-600">•</span>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
