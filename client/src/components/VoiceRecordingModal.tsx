import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Send, Loader2 } from 'lucide-react';

interface VoiceRecordingModalProps {
  isOpen: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string;
  onClose: () => void;
  onSend: () => void;
}

export function VoiceRecordingModal({
  isOpen,
  isRecording,
  isTranscribing,
  transcript,
  onClose,
  onSend,
}: VoiceRecordingModalProps) {
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  // Simulated audio level visualization
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[10000]"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[10001] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-6">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white mb-1">
                    {isTranscribing ? 'Transcribing...' : isRecording ? 'Recording' : 'Voice Input'}
                  </h2>
                  <p className="text-white/80 text-sm">
                    {isTranscribing ? 'Converting speech to text...' : isRecording ? 'Speak now' : 'Ready to record'}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-8">
                {/* Recording Visualization */}
                {isRecording && (
                  <div className="flex flex-col items-center mb-6">
                    {/* Animated Mic Icon */}
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="relative mb-6"
                    >
                      {/* Pulsing Rings */}
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeOut',
                        }}
                        style={{
                          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, transparent 70%)',
                          width: '120px',
                          height: '120px',
                          margin: '-10px',
                        }}
                      />

                      {/* Mic Button */}
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-2xl relative z-10">
                        <Mic className="w-12 h-12 text-white" />
                      </div>
                    </motion.div>

                    {/* Waveform Visualization */}
                    <div className="flex items-center justify-center gap-1 h-20 mb-4">
                      {[...Array(25)].map((_, i) => {
                        const height = isRecording 
                          ? Math.sin(audioLevel + i * 0.5) * 30 + 40 
                          : 10;
                        
                        return (
                          <motion.div
                            key={i}
                            className="w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full"
                            animate={{
                              height: `${height}px`,
                            }}
                            transition={{
                              duration: 0.15,
                              ease: 'easeOut',
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Timer */}
                    <div className="text-center">
                      <motion.div
                        className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                        animate={{
                          opacity: [1, 0.7, 1],
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      >
                        {formatTime(recordingTime)}
                      </motion.div>
                      <p className="text-sm text-gray-500 mt-1">Recording duration</p>
                    </div>
                  </div>
                )}

                {/* Transcribing State */}
                {isTranscribing && (
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative w-24 h-24 mb-6">
                      {/* Spinning Rings */}
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-purple-200 border-t-purple-600"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      />
                      <motion.div
                        className="absolute inset-2 rounded-full border-4 border-pink-200 border-t-pink-600"
                        animate={{ rotate: -360 }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                      </div>
                    </div>

                    <p className="text-lg font-semibold text-gray-700">
                      Converting speech to text...
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Using Deepgram AI • High Accuracy
                    </p>

                    {/* Animated Dots */}
                    <div className="flex gap-2 mt-4">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: 'easeInOut',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Transcript Preview */}
                {transcript && !isRecording && !isTranscribing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transcribed Text:
                    </label>
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                      <p className="text-gray-800 leading-relaxed">
                        {transcript}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Actions */}
                {!isTranscribing && (
                  <div className="flex gap-3">
                    {transcript && !isRecording && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={onSend}
                        className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                      >
                        <Send className="w-5 h-5" />
                        Send Message
                      </motion.button>
                    )}
                    <button
                      onClick={onClose}
                      className={`${transcript && !isRecording ? 'px-6' : 'flex-1'} py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all`}
                    >
                      {isRecording ? 'Stop Recording' : 'Cancel'}
                    </button>
                  </div>
                )}

                {/* Instructions */}
                {!transcript && !isRecording && !isTranscribing && (
                  <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <p className="text-xs text-purple-700 text-center leading-relaxed">
                      🎤 Speak clearly in Hindi, English, or Hinglish
                      <br />
                      Click the mic button to start recording
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

