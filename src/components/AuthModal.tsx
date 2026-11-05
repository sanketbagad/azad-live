import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Lock, Eye, Activity, Crown } from 'lucide-react';
import { useCricket } from '../context/CricketContext';
import { GoogleSignInButton, Logo, RoleBadge } from './ui/Brand';

const ROLES = [
  { icon: Eye, name: 'Viewer', className: 'text-slate-300', text: 'Every new account starts here. Follow live scores and stats.' },
  { icon: Activity, name: 'Scorer', className: 'text-brand-300', text: 'Granted by an admin. Scores and streams only assigned matches.' },
  { icon: Crown, name: 'Admin', className: 'text-trophy-300', text: 'Manages tournaments, teams, users and roles.' },
];

/**
 * Opened when an action needs more access.
 * Signed out: Google sign-in. Signed in: explains how to get a higher role.
 */
export const AuthModal: React.FC = () => {
  const { authModalOpen, setAuthModalOpen, currentUser, userRole } = useCricket();

  return (
    <AnimatePresence>
      {authModalOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setAuthModalOpen(false)}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="w-full sm:max-w-md bg-ink-850 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 pb-safe max-h-[92dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <Logo compact />
              <button
                onClick={() => setAuthModalOpen(false)}
                className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {currentUser ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-trophy-500/10 border border-trophy-500/30 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-7 h-7 text-trophy-400" />
                </div>
                <h3 className="font-display text-3xl font-semibold">More access needed</h3>
                <p className="text-sm text-slate-400 mt-2">
                  You’re signed in as <RoleBadge role={userRole} className="align-middle" />. Ask your tournament admin to
                  upgrade your role or assign you to this match.
                </p>
                <button onClick={() => setAuthModalOpen(false)} className="btn-ghost w-full mt-6">
                  Got it
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-display text-4xl font-semibold leading-none">Sign in to continue</h3>
                <p className="text-sm text-slate-400 mt-2 mb-5">Secure Google sign-in. No passwords.</p>
                <GoogleSignInButton />
                <div className="mt-6 space-y-2">
                  {ROLES.map((r) => (
                    <div key={r.name} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <r.icon className={`w-4 h-4 mt-0.5 shrink-0 ${r.className}`} />
                      <div>
                        <div className={`text-sm font-bold ${r.className}`}>{r.name}</div>
                        <div className="text-xs text-slate-400">{r.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
