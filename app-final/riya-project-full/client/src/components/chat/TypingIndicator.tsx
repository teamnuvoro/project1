export function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4" data-testid="typing-indicator">
      <div className="max-w-[80%] items-start flex flex-col">
        <div className="rounded-2xl px-4 py-3 bg-card text-card-foreground">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-card-foreground/40 animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-card-foreground/40 animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-card-foreground/40 animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
