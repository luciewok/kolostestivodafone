import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastNotificationProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.95 }}
          className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-md shadow-2xl border max-w-sm"
          style={{
            backgroundColor:
              toast.type === 'success'
                ? 'rgba(16, 36, 25, 0.92)'
                : toast.type === 'error'
                ? 'rgba(40, 16, 16, 0.92)'
                : 'rgba(20, 24, 38, 0.92)',
            borderColor:
              toast.type === 'success'
                ? 'rgba(74, 222, 128, 0.35)'
                : toast.type === 'error'
                ? 'rgba(248, 113, 113, 0.35)'
                : 'rgba(96, 165, 250, 0.35)',
          }}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
          <p className="text-sm font-medium text-white select-none">{toast.message}</p>
          <button
            onClick={onDismiss}
            className="text-white/60 hover:text-white transition-colors p-1 ml-auto"
            aria-label="Zavřít"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
