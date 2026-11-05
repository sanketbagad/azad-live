import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Full-screen modal backdrop rendered into <body>.
 * Portalling matters: glass cards (backdrop-filter) and page transitions (transform)
 * would otherwise become the containing block for `position: fixed`, trapping the
 * modal inside the card instead of covering the screen.
 */
export const SheetBackdrop: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) =>
  createPortal(<div className={`sheet-backdrop ${className}`}>{children}</div>, document.body);
