import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface VoiceCallButtonProps {
  disabled?: boolean;
}

export function VoiceCallButton({ disabled }: VoiceCallButtonProps) {
  if (disabled) {
    return (
      <Button
        size="icon"
        className="voice-call-button opacity-50 cursor-not-allowed"
        disabled
      >
        <Phone className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Link href="/call">
      <Button
        size="icon"
        className="voice-call-button"
        data-testid="button-voice-call-floating"
      >
        <Phone className="w-6 h-6" />
      </Button>
    </Link>
  );
}
