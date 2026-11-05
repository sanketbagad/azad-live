import React from 'react';
import { motion } from 'motion/react';
import { Lock, ArrowLeft } from 'lucide-react';

export const AccessDenied: React.FC<{ title?: string; message?: string; onBack: () => void }> = ({
  title = 'You don’t have access to this page',
  message = 'Ask your tournament admin if you need a higher role.',
  onBack,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    className="card max-w-md mx-auto mt-10 p-8 text-center"
  >
    <div className="w-14 h-14 rounded-2xl bg-trophy-500/10 border border-trophy-500/30 flex items-center justify-center mx-auto mb-4">
      <Lock className="w-7 h-7 text-trophy-400" />
    </div>
    <h2 className="font-display text-3xl font-semibold">{title}</h2>
    <p className="text-sm text-slate-400 mt-2">{message}</p>
    <button onClick={onBack} className="btn-ghost mt-6">
      <ArrowLeft className="w-4 h-4" /> Back to Home
    </button>
  </motion.div>
);
