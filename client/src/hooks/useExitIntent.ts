import { useState, useEffect } from 'react';

interface UseExitIntentOptions {
  enabled?: boolean;
  sensitivity?: number; // How close to top before triggering (px)
  delay?: number; // Delay before showing again (ms)
}

export function useExitIntent(options: UseExitIntentOptions = {}) {
  const { enabled = true, sensitivity = 20, delay = 30000 } = options;
  const [showModal, setShowModal] = useState(false);
  const [canShow, setCanShow] = useState(true);

  useEffect(() => {
    if (!enabled || !canShow) return;

    let hasShownOnce = sessionStorage.getItem('exitIntentShown') === 'true';

    const handleMouseLeave = (e: MouseEvent) => {
      // Trigger when mouse leaves through top of page (going to address bar/close)
      if (e.clientY <= sensitivity && !hasShownOnce) {
        console.log('🚪 Exit intent detected!');
        setShowModal(true);
        hasShownOnce = true;
        sessionStorage.setItem('exitIntentShown', 'true');
        
        // Allow showing again after delay
        setCanShow(false);
        setTimeout(() => {
          setCanShow(true);
          sessionStorage.removeItem('exitIntentShown');
        }, delay);
      }
    };

    // Also trigger on back button
    const handlePopState = () => {
      if (!hasShownOnce) {
        console.log('🔙 Back button detected!');
        setShowModal(true);
        hasShownOnce = true;
        sessionStorage.setItem('exitIntentShown', 'true');
        
        setCanShow(false);
        setTimeout(() => {
          setCanShow(true);
          sessionStorage.removeItem('exitIntentShown');
        }, delay);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled, sensitivity, delay, canShow]);

  const closeModal = () => {
    setShowModal(false);
  };

  return { showModal, closeModal };
}

