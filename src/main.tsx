import { createRoot } from 'react-dom/client';
import AOS from 'aos';
import App from './App.tsx';
import './index.css';

AOS.init({
  once: true,
  duration: 650,
  easing: 'ease-out-cubic',
  offset: 24,
  disable: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
});

createRoot(document.getElementById('root')!).render(<App />);
