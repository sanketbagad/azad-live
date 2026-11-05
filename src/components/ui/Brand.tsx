import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Crown, Activity, Eye, AlertCircle } from 'lucide-react';
import { AppUser, UserRole } from '../../types/cricket';
import { useCricket } from '../../context/CricketContext';

export const Logo: React.FC<{ compact?: boolean; onClick?: () => void }> = ({ compact, onClick }) => (
  <button onClick={onClick} className="flex items-center gap-2.5 group" aria-label="AZAD LIVE home">
    <motion.div
      whileHover={{ rotate: -8, scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-pulse-600 flex items-center justify-center shadow-lg shadow-brand-500/30"
    >
      <CricketBall className="w-6 h-6" />
    </motion.div>
    {!compact && (
      <div className="flex items-baseline gap-1.5 leading-none">
        <span className="font-display text-3xl font-semibold tracking-wide text-white pt-1">AZAD</span>
        <span className="chip bg-live-600 text-white shadow-md shadow-live-600/40">Live</span>
      </div>
    )}
  </button>
);

/** Minimal cricket ball with seam; inherits size from className */
export const CricketBall: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <circle cx="24" cy="24" r="20" fill="#dc2626" />
    <circle cx="24" cy="24" r="20" fill="url(#ballShade)" />
    <path d="M14 8c5 9 5 23 0 32" stroke="#fde68a" strokeWidth="1.6" strokeDasharray="2.2 2.4" fill="none" />
    <path d="M34 8c-5 9-5 23 0 32" stroke="#fde68a" strokeWidth="1.6" strokeDasharray="2.2 2.4" fill="none" />
    <defs>
      <radialGradient id="ballShade" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.35" />
      </radialGradient>
    </defs>
  </svg>
);

const ROLE_STYLES: Record<UserRole, { label: string; className: string; icon: React.ElementType }> = {
  admin: { label: 'Admin', className: 'bg-trophy-500/15 text-trophy-300 border border-trophy-500/30', icon: Crown },
  scorer: { label: 'Scorer', className: 'bg-brand-500/15 text-brand-300 border border-brand-500/30', icon: Activity },
  viewer: { label: 'Viewer', className: 'bg-white/5 text-slate-300 border border-white/10', icon: Eye },
};

export const RoleBadge: React.FC<{ role: UserRole; className?: string }> = ({ role, className = '' }) => {
  const style = ROLE_STYLES[role];
  const Icon = style.icon;
  return (
    <span className={`chip ${style.className} ${className}`}>
      <Icon className="w-3 h-3" />
      {style.label}
    </span>
  );
};

export const Avatar: React.FC<{ user: Pick<AppUser, 'name' | 'photoURL'>; size?: number }> = ({ user, size = 36 }) => {
  const [failed, setFailed] = useState(false);
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return user.photoURL && !failed ? (
    <img
      src={user.photoURL}
      alt={user.name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className="rounded-full object-cover ring-2 ring-white/10"
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-brand-500 to-pulse-600 flex items-center justify-center text-xs font-bold text-white ring-2 ring-white/10"
    >
      {initials}
    </div>
  );
};

// Popup errors the user caused themselves; no need to show an error for these
const SILENT_AUTH_ERRORS = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

const GoogleIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export const GoogleSignInButton: React.FC<{ className?: string; label?: string }> = ({
  className = '',
  label = 'Continue with Google',
}) => {
  const { signInWithGoogle } = useCricket();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleClick = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (!SILENT_AUTH_ERRORS.includes(err?.code)) {
        setErrorMessage(
          err?.code === 'auth/popup-blocked'
            ? 'The sign-in popup was blocked. Please allow popups for this site and try again.'
            : err?.message || 'Google sign-in failed. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleClick}
        disabled={isLoading}
        className="w-full min-h-12 rounded-2xl bg-white text-slate-900 font-bold text-sm shadow-xl shadow-brand-500/10 flex items-center justify-center gap-3 disabled:opacity-60"
      >
        {isLoading ? (
          <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        <span>{isLoading ? 'Signing in…' : label}</span>
      </motion.button>
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-live-600/15 border border-live-500/30 text-live-400 text-xs flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </motion.div>
      )}
    </div>
  );
};
