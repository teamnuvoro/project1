import { useState, useRef, useEffect } from "react";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
}

export function OTPInput({ 
  length = 6, 
  value, 
  onChange, 
  onComplete 
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    // Sync with external value - KEEP AS STRING!
    if (value) {
      const newOtp = value.toString().split("").slice(0, length);
      while (newOtp.length < length) newOtp.push("");
      setOtp(newOtp);
      console.log('[OTPInput] Synced with external value:', newOtp.join(''), 'Length:', newOtp.join('').length);
    }
  }, [value, length]);

  const handleChange = (index: number, digit: string) => {
    // Only allow numbers - KEEP AS STRING!
    const sanitized = digit.replace(/\D/g, "").slice(-1); // Take only last char
    
    console.log('[OTPInput handleChange] Index:', index, 'Digit:', digit, 'Sanitized:', sanitized);
    
    if (digit.length > 1 && sanitized.length > 1) {
      // Handle paste
      handlePaste(sanitized);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = sanitized;
    setOtp(newOtp);

    // JOIN WITHOUT SPACES OR COMMAS!
    const newValue = newOtp.join("");
    
    console.log('[OTPInput] Array:', newOtp);
    console.log('[OTPInput] Joined value:', newValue);
    console.log('[OTPInput] Length:', newValue.length);
    console.log('[OTPInput] All boxes filled?', newOtp.every(v => v !== ''));
    
    // IMPORTANT: Call onChange immediately with STRING
    onChange(newValue);

    // Move to next input
    if (sanitized && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete - VALIDATE STRING LENGTH NOT ARRAY LENGTH
    if (newValue.length === length && onComplete) {
      console.log('[OTPInput] Complete! Calling onComplete with:', newValue);
      onComplete(newValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (pastedData: string) => {
    // Remove all non-digits - KEEP AS STRING!
    const sanitized = pastedData.replace(/\D/g, "").slice(0, length);
    const newOtp = sanitized.split("");
    while (newOtp.length < length) newOtp.push("");
    setOtp(newOtp);
    
    // JOIN WITHOUT SPACES OR COMMAS!
    const newValue = newOtp.join("");
    
    console.log('[OTPInput Paste] Sanitized:', sanitized);
    console.log('[OTPInput Paste] Array:', newOtp);
    console.log('[OTPInput Paste] Joined:', newValue);
    console.log('[OTPInput Paste] Length:', newValue.length);
    
    onChange(newValue);

    // Focus last filled input
    const lastFilledIndex = Math.min(sanitized.length, length - 1);
    inputRefs.current[lastFilledIndex]?.focus();

    if (newValue.length === length && onComplete) {
      console.log('[OTPInput Paste] Complete! Calling onComplete');
      onComplete(newValue);
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData("text");
            handlePaste(pastedData);
          }}
          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-400 focus:outline-none transition-all bg-[#f3f3f5] focus:bg-white"
          data-testid={`otp-input-${index}`}
        />
      ))}
    </div>
  );
}

