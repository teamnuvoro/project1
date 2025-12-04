import { AlertCircle, ExternalLink, CheckCircle } from "lucide-react";

interface SetupBannerProps {
  isConfigured: boolean;
}

export function SetupBanner({ isConfigured }: SetupBannerProps) {
  if (isConfigured) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-green-500 text-white px-4 py-2 z-50 flex items-center justify-center gap-2 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>✅ Real AI Voice Calling Enabled! Click audio call to start talking.</span>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black px-4 py-3 z-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-1">⚠️ Voice Calling in Demo Mode</p>
            <p className="text-sm mb-2">
              To enable REAL AI voice calling where you can actually talk to the AI:
            </p>
            <ol className="text-sm space-y-1 mb-2 ml-4 list-decimal">
              <li>
                <a 
                  href="https://vapi.ai/signup" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:no-underline inline-flex items-center gap-1"
                >
                  Sign up at Vapi.ai (free)
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Get API key from Dashboard → API Keys</li>
              <li>Add it to <code className="bg-black/20 px-1 rounded">.env</code> as <code className="bg-black/20 px-1 rounded">VITE_VAPI_PUBLIC_KEY</code></li>
              <li>Restart: <code className="bg-black/20 px-1 rounded">npm run dev</code></li>
            </ol>
            <p className="text-xs">
              📚 First 10 minutes are FREE on Vapi.ai!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

