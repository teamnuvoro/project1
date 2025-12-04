import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, X } from 'lucide-react';
import { FuturisticLoader } from './FuturisticLoader';

interface AmplitudePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AmplitudePasswordModal({ isOpen, onClose, onSuccess }: AmplitudePasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  // Change this password to whatever you want
  const CORRECT_PASSWORD = 'riya123';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Show loader after a brief moment
    setTimeout(() => {
      setShowLoader(true);
    }, 200);

    // Verify password with delay for loader to show
    setTimeout(() => {
      if (password === CORRECT_PASSWORD) {
        // Keep loader showing for 1.5 more seconds for effect
        setTimeout(() => {
          setIsLoading(false);
          setShowLoader(false);
          setPassword('');
          onSuccess();
          onClose();
        }, 1800);
      } else {
        setShowLoader(false);
        setError('Incorrect password. Please try again.');
        setIsLoading(false);
        setPassword('');
      }
    }, 800);
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    setShowLoader(false);
    onClose();
  };

  return (
    <>
      {/* Futuristic Loader */}
      <FuturisticLoader isOpen={showLoader} message="ACCESSING ANALYTICS" />

      {/* Password Modal */}
      <AnimatePresence>
        {isOpen && !showLoader && (
          <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000]"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[10001] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5 relative">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Protected Access</h2>
                    <p className="text-white/80 text-sm">Enter password to view analytics</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Password Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError('');
                        }}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="Enter password"
                        autoFocus
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 text-gray-500" />
                        ) : (
                          <Eye className="w-5 h-5 text-gray-500" />
                        )}
                      </button>
                    </div>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm mt-2 flex items-center gap-1"
                      >
                        ⚠️ {error}
                      </motion.p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!password || isLoading}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying...
                      </span>
                    ) : (
                      'Unlock Analytics'
                    )}
                  </button>
                </form>

                {/* Info */}
                <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-xs text-purple-700 text-center">
                    🔒 This page is protected to ensure data privacy and security
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </>
        )}
      </AnimatePresence>
    </>
  );
}

