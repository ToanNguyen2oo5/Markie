import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Info,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { useToast, type ToastType } from '../context/ToastContext';

const toastConfig: Record<
  ToastType,
  { icon: typeof CheckCircle; iconColor: string; borderColor: string; bgGlow: string }
> = {
  success: {
    icon: CheckCircle,
    iconColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgGlow: 'bg-emerald-500/10',
  },
  error: {
    icon: XCircle,
    iconColor: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    bgGlow: 'bg-rose-500/10',
  },
  warning: {
    icon: WarningCircle,
    iconColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgGlow: 'bg-amber-500/10',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    bgGlow: 'bg-blue-500/10',
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const config = toastConfig[toast.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-900/95 backdrop-blur-md border ${config.borderColor} shadow-2xl shadow-black/50 overflow-hidden relative group`}
            >
              {/* Subtle ambient light */}
              <div
                className={`absolute -left-4 -top-4 w-16 h-16 rounded-full ${config.bgGlow} blur-xl pointer-events-none`}
              />

              <div className="flex-shrink-0 mt-0.5">
                <Icon className={`w-5 h-5 ${config.iconColor}`} weight="fill" />
              </div>

              <div className="flex-1 min-w-0 pr-1">
                {toast.title && (
                  <h4 className="text-[13px] font-semibold text-zinc-100 tracking-tight leading-snug">
                    {toast.title}
                  </h4>
                )}
                <p className="text-[13px] text-zinc-300 leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 rounded-md hover:bg-zinc-800"
                aria-label="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
