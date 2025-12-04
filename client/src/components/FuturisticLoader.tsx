import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';

interface FuturisticLoaderProps {
  isOpen: boolean;
  message?: string;
}

export function FuturisticLoader({ isOpen, message = 'ACCESSING ANALYTICS' }: FuturisticLoaderProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #1a0033 0%, #2d1b4e 25%, #1a0033 50%, #2d1b4e 75%, #1a0033 100%)',
            backgroundSize: '400% 400%',
            animation: 'gradientWave 8s ease infinite',
          }}
        >
          {/* Animated Grid Background */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              animation: 'gridMove 20s linear infinite',
            }}
          />

          {/* Glowing Orbs */}
          <motion.div
            className="absolute w-96 h-96 rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute w-96 h-96 rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%)',
            }}
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.6, 0.3, 0.6],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Rotating Lock Icon */}
            <motion.div
              animate={{
                rotateY: [0, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{
                rotateY: { duration: 3, repeat: Infinity, ease: 'linear' },
                scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="mb-8"
            >
              <div className="relative">
                {/* Glow Ring */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(168, 85, 247, 0.5)',
                      '0 0 60px rgba(236, 72, 153, 0.8)',
                      '0 0 20px rgba(168, 85, 247, 0.5)',
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                
                {/* Lock Icon */}
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Lock className="w-12 h-12 text-white" />
                </div>

                {/* Orbiting Sparkles */}
                {[0, 120, 240].map((rotation, i) => (
                  <motion.div
                    key={i}
                    className="absolute top-1/2 left-1/2"
                    style={{
                      marginLeft: '-6px',
                      marginTop: '-6px',
                    }}
                    animate={{
                      rotate: [rotation, rotation + 360],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  >
                    <div
                      style={{
                        transform: 'translateX(50px)',
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Loading Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <h2 
                className="text-4xl font-bold mb-2 tracking-wider"
                style={{
                  fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
                  background: 'linear-gradient(90deg, #a855f7, #ec4899, #a855f7)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'shimmer 3s linear infinite',
                }}
              >
                {message}
              </h2>
              
              {/* Animated Dots */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
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

              {/* Progress Bar */}
              <div className="mt-8 w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"
                  style={{
                    backgroundSize: '200% 100%',
                  }}
                  animate={{
                    x: ['-100%', '100%'],
                    backgroundPosition: ['0% 0%', '200% 0%'],
                  }}
                  transition={{
                    x: { duration: 1.5, repeat: Infinity, ease: 'linear' },
                    backgroundPosition: { duration: 2, repeat: Infinity, ease: 'linear' },
                  }}
                />
              </div>

              {/* Subtitle */}
              <motion.p
                className="text-sm text-purple-300 mt-6 tracking-widest"
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  letterSpacing: '0.2em',
                }}
              >
                VERIFYING CREDENTIALS
              </motion.p>
            </motion.div>

            {/* Scanning Line Effect */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-50"
              animate={{
                y: [0, window.innerHeight, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </div>

          {/* CSS Animations */}
          <style>{`
            @keyframes gradientWave {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }

            @keyframes gridMove {
              0% { transform: translate(0, 0); }
              100% { transform: translate(50px, 50px); }
            }

            @keyframes shimmer {
              0% { background-position: 0% center; }
              100% { background-position: 200% center; }
            }

            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@600;700&display=swap');
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

