import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen gradient-welcome flex flex-col items-center justify-between px-6 py-12">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">
        {/* Heart Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-10"
        >
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-300/50 animate-float">
            <Heart className="w-14 h-14 text-white fill-white" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl md:text-5xl font-bold text-foreground mb-6"
          data-testid="text-welcome-title"
        >
          Welcome to Riya AI
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-lg text-muted-foreground leading-relaxed mb-12"
          data-testid="text-welcome-subtitle"
        >
          I'm here to help you understand relationships better and guide you toward meaningful companionship.
        </motion.p>
      </div>

      {/* Bottom Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="w-full max-w-md space-y-4"
      >
        <Link href="/signup">
          <Button
            size="lg"
            className="w-full h-14 text-lg rounded-full gradient-primary-button text-white shadow-lg shadow-purple-400/30 hover:shadow-xl hover:shadow-purple-400/40 transition-all"
            data-testid="button-get-started"
          >
            Let's Get Started
          </Button>
        </Link>

        <p className="text-center text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login">
            <span 
              className="text-foreground font-semibold underline underline-offset-2 cursor-pointer"
              data-testid="link-login"
            >
              Login
            </span>
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
