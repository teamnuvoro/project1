import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X } from 'lucide-react';

interface ExitIntentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExitIntentModal({ isOpen, onClose }: ExitIntentModalProps) {
  const handleClose = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    onClose();
  };

  const handleStay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[10000]"
            onClick={() => handleClose()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          />

          <div
            className="fixed inset-0 flex items-center justify-center z-[10002] p-4 pointer-events-none"
            aria-hidden={!isOpen}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative cursor-default pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                onPointerDown={(e) => { e.stopPropagation(); handleClose(e as unknown as React.MouseEvent); }}
                className="absolute top-4 right-4 z-[60] p-2 rounded-full bg-white/80 hover:bg-gray-100 transition-colors cursor-pointer shadow-sm"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-pink-50 to-white opacity-50 z-0 pointer-events-none" />

              {/* Floating Hearts - do not block clicks */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-pink-300 opacity-30 z-0 pointer-events-none"
                  style={{
                    left: `${20 + i * 20}%`,
                    top: '100%',
                    fontSize: '24px',
                  }}
                  animate={{
                    y: [0, -400],
                    opacity: [0.3, 0, 0],
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 4 + i,
                    repeat: Infinity,
                    delay: i * 0.8,
                    ease: 'easeOut',
                  }}
                >
                  💕
                </motion.div>
              ))}

              {/* Content */}
              <div className="relative z-10 px-8 py-10 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: 0.1,
                  }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-6 shadow-lg"
                >
                  <Heart className="w-10 h-10 text-white" fill="white" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold text-gray-900 mb-3"
                >
                  Please Don't Leave! 💜
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-600 leading-relaxed mb-6"
                >
                  I'm here for you! Let's continue our conversation.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3"
                >
                  <button
                    type="button"
                    onClick={handleStay}
                    onPointerDown={(e) => { e.stopPropagation(); handleStay(e); }}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer z-[60] relative"
                  >
                    <Heart className="w-5 h-5" />
                    Stay & Continue Chatting
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

