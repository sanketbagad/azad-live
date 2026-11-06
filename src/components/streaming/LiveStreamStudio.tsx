import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCricket } from '../../context/CricketContext';
import { Match, StreamQualityPreset, StreamHealthStatus, CustomStreamLogos } from '../../types/cricket';
import { createVideoCompositor, CompositorController, ReplayStatus } from '../../services/videoCompositor';
import { ReplayBuffer } from '../../services/replayBuffer';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  SwitchCamera,
  Radio,
  Play,
  Square,
  AlertCircle,
  Copy,
  ExternalLink,
  Settings,
  ShieldCheck,
  Flame,
  Zap,
  Activity,
  CheckCircle2,
  Tv,
  Eye,
  Sparkles,
  Wifi,
  ChevronDown,
  ChevronUp,
  X,
  Volume2,
  Upload,
  Trash2,
  Image as ImageIcon,
  Lock,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  Check,
  Rewind,
  Gauge,
  Download,
  Circle,
  Smartphone,
  Monitor,
} from 'lucide-react';

export type MediaDeviceErrorCategory =
  | 'PermissionDenied'
  | 'NotFoundError'
  | 'DeviceBusy'
  | 'OverconstrainedError'
  | 'IframeRestricted'
  | 'UnsupportedError'
  | 'UnknownError';

export interface MediaDeviceDiagnostics {
  category: MediaDeviceErrorCategory;
  title: string;
  badge: string;
  description: string;
  troubleshootingSteps: string[];
  suggestedAction: string;
  isRetryable: boolean;
  canTryRelaxedFallback: boolean;
  rawErrorName: string;
  rawErrorMessage: string;
  timestamp: number;
}

export function analyzeMediaError(err: any): MediaDeviceDiagnostics {
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const name = err?.name || '';
  const msg = err?.message || '';
  const lower = `${name} ${msg}`.toLowerCase();

  // 1. Permission Denied (NotAllowedError / PermissionDeniedError / User rejection)
  if (
    name === 'NotAllowedError' ||
    name === 'PermissionDeniedError' ||
    name === 'SecurityError' ||
    lower.includes('permission denied') ||
    lower.includes('permission dismissed') ||
    lower.includes('not allowed') ||
    lower.includes('user denied')
  ) {
    if (isIframe) {
      return {
        category: 'IframeRestricted',
        title: 'Camera Access Blocked in Preview Frame',
        badge: 'Iframe Security Policy',
        description:
          'Browser security restricts direct webcam and microphone access within embedded preview frames. Launch standalone to grant hardware permissions.',
        troubleshootingSteps: [
          'Tap "Open Standalone" below to launch the broadcaster studio in a direct mobile browser tab.',
          'When prompted by Chrome/Safari, tap "Allow" for Camera & Microphone.',
          'Your match state and live studio controls will load automatically in the new tab.',
        ],
        suggestedAction: 'Open Standalone Tab',
        isRetryable: true,
        canTryRelaxedFallback: false,
        rawErrorName: name || 'NotAllowedError',
        rawErrorMessage: msg || 'Iframe restriction',
        timestamp: Date.now(),
      };
    }

    return {
      category: 'PermissionDenied',
      title: 'Camera & Microphone Access Denied',
      badge: 'Permission Denied',
      description:
        'AZAD LIVE was denied permission to access your camera and microphone. The browser has blocked hardware access.',
      troubleshootingSteps: [
        'Click the Lock / Site Settings icon (🔒) on the left side of your browser address bar.',
        'Find "Camera" and "Microphone" in the permissions list and change both to "Allow".',
        'On Android Chrome: Tap ⋮ (menu) > Settings > Site settings > Camera / Microphone > Remove site blockage.',
        'On iOS Safari: Go to iPhone Settings > Safari > Camera / Mic > set to "Ask" or "Allow".',
        'Once permissions are updated, tap "Retry Camera Access" below.',
      ],
      suggestedAction: 'Allow Camera in Browser Settings & Retry',
      isRetryable: true,
      canTryRelaxedFallback: true,
      rawErrorName: name || 'NotAllowedError',
      rawErrorMessage: msg || 'Permission denied by user or policy',
      timestamp: Date.now(),
    };
  }

  // 2. Not Found (NotFoundError / DevicesNotFoundError)
  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    lower.includes('not found') ||
    lower.includes('no device') ||
    lower.includes('devices not found') ||
    lower.includes('requested device not found')
  ) {
    return {
      category: 'NotFoundError',
      title: 'No Camera or Microphone Hardware Found',
      badge: 'Device Not Found',
      description:
        'The browser could not detect any connected camera or microphone hardware on this device.',
      troubleshootingSteps: [
        'Check if an external USB camera or microphone is securely plugged in.',
        'Ensure laptop physical privacy shutters or hardware disable switches are open.',
        'Check device drivers in Device Manager or system settings to ensure hardware is enabled.',
        'You can continue broadcasting with AZAD LIVE Virtual Stadium Graphics mode without camera.',
      ],
      suggestedAction: 'Check Hardware Connection & Retry',
      isRetryable: true,
      canTryRelaxedFallback: true,
      rawErrorName: name || 'NotFoundError',
      rawErrorMessage: msg || 'No camera/mic hardware found',
      timestamp: Date.now(),
    };
  }

  // 3. Device Busy (NotReadableError / TrackStartError / AbortError / Hardware locked)
  if (
    name === 'NotReadableError' ||
    name === 'TrackStartError' ||
    name === 'AbortError' ||
    lower.includes('device in use') ||
    lower.includes('could not start video source') ||
    lower.includes('already in use') ||
    lower.includes('busy') ||
    lower.includes('could not start audio source') ||
    lower.includes('hardware error')
  ) {
    return {
      category: 'DeviceBusy',
      title: 'Camera or Microphone in Use (Device Busy)',
      badge: 'Device Busy / In Use',
      description:
        'The camera or microphone hardware is currently locked by another application or background process.',
      troubleshootingSteps: [
        'Close other apps using the camera or mic: WhatsApp, Zoom, Google Meet, OBS, Discord, or Camera app.',
        'Close other browser tabs that may have active video or audio feeds.',
        'On mobile phones, swipe away background camera apps from recent tasks.',
        'Tap "Try Video Only" if the microphone alone is locked, or tap "Retry Camera Access".',
      ],
      suggestedAction: 'Close Conflicting Apps & Retry',
      isRetryable: true,
      canTryRelaxedFallback: true,
      rawErrorName: name || 'NotReadableError',
      rawErrorMessage: msg || 'Hardware locked by another application',
      timestamp: Date.now(),
    };
  }

  // 4. OverconstrainedError (ConstraintNotSatisfiedError)
  if (
    name === 'OverconstrainedError' ||
    name === 'ConstraintNotSatisfiedError' ||
    lower.includes('overconstrained') ||
    lower.includes('constraint')
  ) {
    return {
      category: 'OverconstrainedError',
      title: 'Resolution / Camera Constraint Not Supported',
      badge: 'Unsupported Resolution',
      description:
        'The requested video resolution or lens constraint is not supported by your camera hardware.',
      troubleshootingSteps: [
        'Tap "Retry Camera Access" to re-attempt with relaxed standard resolution (720p/480p).',
        'Switch between Front and Back camera using the toggle button.',
      ],
      suggestedAction: 'Retry with Relaxed Constraints',
      isRetryable: true,
      canTryRelaxedFallback: true,
      rawErrorName: name || 'OverconstrainedError',
      rawErrorMessage: msg || 'Constraint could not be satisfied',
      timestamp: Date.now(),
    };
  }

  // 5. Unsupported / Insecure context
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      category: 'UnsupportedError',
      title: 'MediaDevices Not Supported in this Context',
      badge: 'Context Unsupported',
      description:
        'The getUserMedia API is unavailable. Camera streaming requires a secure HTTPS origin or modern browser.',
      troubleshootingSteps: [
        'Ensure you are accessing via HTTPS (https://...).',
        'Update your mobile browser to the latest version of Chrome or Safari.',
        'Open via direct standalone URL instead of embedded webviews.',
      ],
      suggestedAction: 'Open via Modern HTTPS Browser',
      isRetryable: false,
      canTryRelaxedFallback: false,
      rawErrorName: 'UnsupportedError',
      rawErrorMessage: 'navigator.mediaDevices is undefined',
      timestamp: Date.now(),
    };
  }

  // Fallback / Unknown
  return {
    category: 'UnknownError',
    title: 'Camera Initialization Issue',
    badge: 'Hardware Notice',
    description: msg || 'Unable to access video capture device.',
    troubleshootingSteps: [
      'Tap "Retry Camera Access" to re-initialize camera capture.',
      'Try switching between Front and Back camera.',
      'Or broadcast in Virtual Stadium mode with pre-match score graphics.',
    ],
    suggestedAction: 'Retry Camera Access',
    isRetryable: true,
    canTryRelaxedFallback: true,
    rawErrorName: name || 'UnknownError',
    rawErrorMessage: msg || 'Unknown hardware error',
    timestamp: Date.now(),
  };
}

interface LiveStreamStudioProps {
  initialMatchId?: string;
  onClose?: () => void;
}

export const LiveStreamStudio: React.FC<LiveStreamStudioProps> = ({
  initialMatchId,
  onClose,
}) => {
  const { state, currentUser, userRole, openAuthModal, getAuthHeaders, canScoreMatch } = useCricket();

  // Active match selection
  const [selectedMatchId, setSelectedMatchId] = useState<string>(() => {
    if (initialMatchId && state.matches[initialMatchId]) return initialMatchId;
    const liveMatches = Object.values(state.matches).filter(
      (m) => m.status === 'live' || m.status === 'innings_break'
    );
    if (liveMatches.length > 0) return liveMatches[0].id;
    const allMatches = Object.values(state.matches).sort((a, b) => b.updatedAt - a.updatedAt);
    return allMatches.length > 0 ? allMatches[0].id : '';
  });

  const activeMatch = selectedMatchId ? state.matches[selectedMatchId] || null : null;
  const matchRef = useRef<Match | null>(activeMatch);
  useEffect(() => {
    matchRef.current = activeMatch;
  }, [activeMatch]);

  // Camera & Audio State
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [qualityPreset, setQualityPreset] = useState<StreamQualityPreset>('720p');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState(0);

  // Overlay toggles
  const [showScoreboard, setShowScoreboard] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);
  const [showEventAlerts, setShowEventAlerts] = useState(true);

  // Stream Configuration
  const [streamKey, setStreamKey] = useState<string>(() => {
    return localStorage.getItem('azad_youtube_stream_key') || '';
  });
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [customBroadcastId, setCustomBroadcastId] = useState<string>('');

  // Live Broadcast State
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamSessionId, setStreamSessionId] = useState<string | null>(null);
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
  const [liveDuration, setLiveDuration] = useState('00:00:00');
  const [streamHealth, setStreamHealth] = useState<StreamHealthStatus>('good');
  const [fpsCounter, setFpsCounter] = useState(30);
  const [uploadBitrateKbps, setUploadBitrateKbps] = useState(0);
  const [totalBytesStreamed, setTotalBytesStreamed] = useState(0);
  const [youtubeWatchUrl, setYoutubeWatchUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [mediaDiagnostics, setMediaDiagnostics] = useState<MediaDeviceDiagnostics | null>(null);
  const [isRetryingCamera, setIsRetryingCamera] = useState<boolean>(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);
  const [showTroubleshootingSteps, setShowTroubleshootingSteps] = useState<boolean>(false);
  const [retryAttempts, setRetryAttempts] = useState<number>(0);
  const [isVirtualFeed, setIsVirtualFeed] = useState<boolean>(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogosModalOpen, setIsLogosModalOpen] = useState(false);
  const [customLogos, setCustomLogos] = useState<CustomStreamLogos>(() => {
    if (activeMatch?.customLogos && Object.keys(activeMatch.customLogos).length > 0) {
      return activeMatch.customLogos;
    }
    try {
      const saved = localStorage.getItem('azad_default_custom_logos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  useEffect(() => {
    if (activeMatch?.customLogos && Object.keys(activeMatch.customLogos).length > 0) {
      setCustomLogos(activeMatch.customLogos);
    }
  }, [activeMatch?.customLogos]);

  const handleSaveAsDefault = () => {
    try {
      localStorage.setItem('azad_default_custom_logos', JSON.stringify(customLogos));
      alert('Tournament and sponsor logos saved as default! New matches will automatically prepopulate with these logos.');
    } catch (e) {
      console.warn('Could not save defaults to localStorage:', e);
    }
  };

  const handleUpdateLogoScale = (scale: number) => {
    const updated: CustomStreamLogos = { ...customLogos, logoScale: scale };
    setCustomLogos(updated);
    saveLogosToServer(updated);
  };

  const handleUpdateScoreboardPosition = (pos: 'bottom' | 'top') => {
    const updated: CustomStreamLogos = { ...customLogos, scoreboardPosition: pos };
    setCustomLogos(updated);
    saveLogosToServer(updated);
  };

  const handleLogoUpload = (type: 'tournamentLogo' | 'team1Logo' | 'team2Logo' | 'sponsorLogo', file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo file must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        const updated: CustomStreamLogos = { ...customLogos, [type]: dataUrl };
        setCustomLogos(updated);
        saveLogosToServer(updated);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (type: 'tournamentLogo' | 'team1Logo' | 'team2Logo' | 'sponsorLogo') => {
    const updated = { ...customLogos };
    delete updated[type];
    setCustomLogos(updated);
    saveLogosToServer(updated);
  };

  const handleUpdateSponsorTagline = (tagline: string) => {
    const updated: CustomStreamLogos = { ...customLogos, sponsorTagline: tagline };
    setCustomLogos(updated);
    saveLogosToServer(updated);
  };

  const saveLogosToServer = async (logos: CustomStreamLogos) => {
    if (!selectedMatchId) return;
    try {
      await fetch('/api/stream/save-logos', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ matchId: selectedMatchId, logos }),
      });
    } catch (err) {
      console.warn('Failed to save logos to server:', err);
    }
  };

  // DOM and Engine references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositorRef = useRef<CompositorController | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wakeLockSentinelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameAudioRef = useRef<number | null>(null);
  const chunkQueueRef = useRef<Blob[]>([]);
  const isUploadingRef = useRef(false);

  // ---------- Instant replay ----------
  const replayBufferRef = useRef<ReplayBuffer | null>(null);
  if (!replayBufferRef.current) replayBufferRef.current = new ReplayBuffer(35, 15);
  const [replayStatus, setReplayStatus] = useState<ReplayStatus>({ active: false, progress: 0, speed: 1 });
  const [bufferedSeconds, setBufferedSeconds] = useState(0);
  const [slowMo, setSlowMo] = useState(false);
  const [autoReplay, setAutoReplay] = useState(() => localStorage.getItem('azad_auto_replay') !== 'off');
  const [saveReplayClips, setSaveReplayClips] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  // ---------- Local match recording ----------
  const [isRecording, setIsRecording] = useState(false);
  const [recordStartedAt, setRecordStartedAt] = useState<number | null>(null);
  const [recordElapsed, setRecordElapsed] = useState('00:00');
  const recordRecorderRef = useRef<MediaRecorder | null>(null);
  const recordContinueRef = useRef(false);
  const recordSplitTimerRef = useRef<any>(null);
  const recordPartRef = useRef(1);

  // ---------- Where "Go Live" can run ----------
  // null = unknown yet; false = this deployment can't relay to YouTube (e.g. Vercel)
  const [relayAvailable, setRelayAvailable] = useState<boolean | null>(null);
  const [isGoLiveGuideOpen, setIsGoLiveGuideOpen] = useState(false);
  const [copiedOverlay, setCopiedOverlay] = useState<string | null>(null);

  const canBroadcast = Boolean(selectedMatchId) && canScoreMatch(selectedMatchId);

  // Enumerate devices on mount
  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setAvailableCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCameraId) {
          setSelectedCameraId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.warn('Could not enumerate media devices:', err);
      }
    }
    getDevices();
  }, [selectedCameraId]);

  // Request Screen Wake Lock to prevent phone screen from going black during live
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        const sentinel = await (navigator as any).wakeLock.request('screen');
        wakeLockSentinelRef.current = sentinel;
        setIsWakeLockActive(true);
        sentinel.addEventListener('release', () => {
          setIsWakeLockActive(false);
        });
      }
    } catch (err) {
      console.warn('Screen WakeLock request error:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinelRef.current) {
      try {
        await wakeLockSentinelRef.current.release();
        wakeLockSentinelRef.current = null;
        setIsWakeLockActive(false);
      } catch {
        // ignore
      }
    }
  }, []);

  // Re-acquire wake lock if tab is switched back
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isStreaming) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isStreaming, requestWakeLock]);

  // Resolution dimensions helper
  const getResolutionDimensions = (preset: StreamQualityPreset) => {
    switch (preset) {
      case '1080p':
        return { width: 1920, height: 1080, bitrate: 4500000 };
      case '480p':
        return { width: 854, height: 480, bitrate: 1200000 };
      case '720p':
      default:
        return { width: 1280, height: 720, bitrate: 2500000 };
    }
  };

  // Ensure 30fps Video Compositor is ALWAYS active (with camera or virtual stadium background)
  const initCompositor = useCallback(() => {
    if (!canvasRef.current) return;
    const { width, height } = getResolutionDimensions(qualityPreset);

    if (compositorRef.current) {
      compositorRef.current.stop();
    }

    compositorRef.current = createVideoCompositor(
      videoRef.current,
      canvasRef.current,
      () => matchRef.current,
      {
        width,
        height,
        fps: 30,
        showScoreboard,
        showWatermark,
        showRecentBalls: true,
        showEventAlerts,
        customLogos,
        replayBuffer: replayBufferRef.current ?? undefined,
      }
    );
  }, [qualityPreset, showScoreboard, showWatermark, showEventAlerts, customLogos]);

  // Start Camera & Audio Stream with Multi-Tier Retry Support
  const startCamera = useCallback(
    async (retryMode: 'standard' | 'relaxed' | 'video_only' = 'standard') => {
      setIsRetryingCamera(true);
      setPermissionError(null);
      initCompositor();

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera MediaDevices API not available in this browser context.');
        }

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }

        const { width, height } = getResolutionDimensions(qualityPreset);

        let constraints: MediaStreamConstraints;
        if (retryMode === 'video_only') {
          // Fallback if microphone is busy with another app (e.g. WhatsApp, phone call)
          constraints = {
            video: selectedCameraId
              ? { deviceId: { exact: selectedCameraId } }
              : { facingMode },
            audio: false,
          };
        } else if (retryMode === 'relaxed') {
          // Fallback if strict resolution constraints are rejected
          constraints = {
            video: { facingMode },
            audio: true,
          };
        } else {
          constraints = {
            video: selectedCameraId
              ? { deviceId: { exact: selectedCameraId }, width: { ideal: width }, height: { ideal: height } }
              : { facingMode, width: { ideal: width }, height: { ideal: height } },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          };
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (initialErr: any) {
          // If standard mode failed with OverconstrainedError or NotFound on deviceId, try relaxed fallback automatically
          if (
            retryMode === 'standard' &&
            (initialErr.name === 'OverconstrainedError' ||
              initialErr.name === 'NotFoundError' ||
              initialErr.name === 'ConstraintNotSatisfiedError')
          ) {
            console.warn('Strict constraints rejected, attempting relaxed fallback...', initialErr);
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          } else {
            throw initialErr;
          }
        }

        mediaStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // Audio Analyser Setup for VU Meter if audio tracks exist
        if (stream.getAudioTracks().length > 0) {
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateAudioMeter = () => {
              if (!analyserRef.current) return;
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 255) * 130)));
              animFrameAudioRef.current = requestAnimationFrame(updateAudioMeter);
            };
            updateAudioMeter();
          } catch (e) {
            console.warn('Audio meter init notice:', e);
          }
        }

        setIsCameraActive(true);
        setIsVirtualFeed(false);
        setMediaDiagnostics(null);
        setIsBannerDismissed(false);
        setRetryAttempts(0);
        setStatusMessage(
          retryMode === 'video_only'
            ? 'Camera Ready (Microphone Bypassed • Silent Audio Track Active)'
            : 'Camera & Microphone Ready'
        );
      } catch (err: any) {
        console.warn('Camera initialization diagnostic caught:', err);
        const diag = analyzeMediaError(err);
        setMediaDiagnostics(diag);
        setPermissionError(diag.description);
        setIsCameraActive(false);
        setIsVirtualFeed(true);
        setRetryAttempts((prev) => prev + 1);
        setStatusMessage(`Camera Offline: ${diag.badge} • Virtual Stadium Mode Active`);
      } finally {
        setIsRetryingCamera(false);
      }
    },
    [facingMode, selectedCameraId, qualityPreset, initCompositor]
  );

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (animFrameAudioRef.current) {
      cancelAnimationFrame(animFrameAudioRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Initialize compositor & attempt camera on mount
  useEffect(() => {
    initCompositor();
    startCamera();
    return () => {
      stopCamera();
      releaseWakeLock();
    };
  }, [initCompositor]);

  // Handle front/back switch
  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  useEffect(() => {
    if (isCameraActive && !isStreaming) {
      startCamera();
    }
  }, [facingMode]);

  // Audio Mute Toggle
  const handleToggleMic = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = isMicMuted;
      });
      setIsMicMuted(!isMicMuted);
    }
  };

  // Live Timer
  useEffect(() => {
    let interval: any;
    if (isStreaming && streamStartTime) {
      interval = setInterval(() => {
        const diff = Math.floor((Date.now() - streamStartTime) / 1000);
        const h = String(Math.floor(diff / 3600)).padStart(2, '0');
        const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const s = String(diff % 60).padStart(2, '0');
        setLiveDuration(`${h}:${m}:${s}`);
      }, 1000);
    } else {
      setLiveDuration('00:00:00');
    }
    return () => clearInterval(interval);
  }, [isStreaming, streamStartTime]);

  // Upload Chunk Queue Worker
  const processChunkQueue = async (sessionId: string) => {
    if (isUploadingRef.current || chunkQueueRef.current.length === 0) return;
    isUploadingRef.current = true;

    while (chunkQueueRef.current.length > 0) {
      const chunk = chunkQueueRef.current.shift();
      if (!chunk) continue;

      const startTime = performance.now();
      try {
        const res = await fetch(`/api/stream/chunk/${sessionId}`, {
          method: 'POST',
          headers: {
            ...(await getAuthHeaders()),
            'Content-Type': chunk.type || 'application/octet-stream',
          },
          body: chunk,
        });

        const elapsedMs = performance.now() - startTime;
        if (res.ok) {
          const chunkSizeBits = chunk.size * 8;
          const currentKbps = Math.round((chunkSizeBits / (elapsedMs / 1000)) / 1000);
          setUploadBitrateKbps(currentKbps);
          setTotalBytesStreamed((prev) => prev + chunk.size);

          if (elapsedMs < 1200) {
            setStreamHealth('excellent');
          } else if (elapsedMs < 2500) {
            setStreamHealth('good');
          } else {
            setStreamHealth('fair');
          }
        } else {
          setStreamHealth('poor');
        }
      } catch (err) {
        console.warn('Error uploading stream chunk:', err);
        setStreamHealth('reconnecting');
      }
    }

    isUploadingRef.current = false;
  };

  // START LIVE BROADCAST
  const handleStartLive = async () => {
    if (!canBroadcast) {
      openAuthModal();
      return;
    }

    // This deployment can't relay video to YouTube: show how to go live with a streaming app
    if (relayAvailable === false) {
      setIsGoLiveGuideOpen(true);
      return;
    }

    // Ensure compositor is initialized
    if (!compositorRef.current) {
      initCompositor();
    }

    if (!compositorRef.current) {
      alert('Broadcast canvas is initializing, please try again in a moment.');
      return;
    }

    const trimmedKey = streamKey.trim();
    if (trimmedKey) {
      localStorage.setItem('azad_youtube_stream_key', trimmedKey);
    }

    setIsConnecting(true);
    setStatusMessage('Connecting to YouTube Ingest & Initializing Broadcaster...');

    try {
      // 1. Call server to initiate session and spawn FFmpeg RTMPS relay
      const res = await fetch('/api/stream/start', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          matchId: selectedMatchId,
          streamKey: trimmedKey,
          quality: qualityPreset,
          youtubeBroadcastId: customBroadcastId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start stream on server');
      }

      const activeSessionId = data.sessionId;
      setStreamSessionId(activeSessionId);
      setYoutubeWatchUrl(data.watchUrl || `https://youtube.com/live`);

      // 2. Prepare composite stream (Canvas video + Mic audio or silent audio track fallback)
      const canvasStream = compositorRef.current.getStream();
      let audioTracks = mediaStreamRef.current ? mediaStreamRef.current.getAudioTracks() : [];

      if (audioTracks.length === 0) {
        try {
          const silentAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const dest = silentAudioCtx.createMediaStreamDestination();
          audioTracks = dest.stream.getAudioTracks();
        } catch (e) {
          console.warn('Could not generate silent audio track fallback:', e);
        }
      }

      const compositeMediaStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioTracks,
      ]);

      // 3. Setup MediaRecorder with cross-browser codecs
      const { bitrate } = getResolutionDimensions(qualityPreset);
      let selectedMimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(selectedMimeType)) {
        if (MediaRecorder.isTypeSupported('video/webm')) {
          selectedMimeType = 'video/webm';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          selectedMimeType = 'video/mp4';
        }
      }

      const recorder = new MediaRecorder(compositeMediaStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: bitrate,
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunkQueueRef.current.push(event.data);
          processChunkQueue(activeSessionId);
        }
      };

      recorder.onstart = () => {
        setIsStreaming(true);
        setIsConnecting(false);
        setStreamStartTime(Date.now());
        requestWakeLock();
        setStatusMessage('🔴 ON AIR: LIVE TO YOUTUBE');
      };

      recorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        setStatusMessage('Recording error, attempting to recover...');
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // 1-second chunks for low-latency transmission
    } catch (err: any) {
      console.error('Failed to start live broadcast:', err);
      setIsConnecting(false);
      setIsStreaming(false);
      setStatusMessage(`Failed to go live: ${err.message}`);
      if (/not available/i.test(err.message || '')) {
        setRelayAvailable(false);
        setIsGoLiveGuideOpen(true);
      }
    }
  };

  // END LIVE BROADCAST
  const handleEndLive = async () => {
    if (!confirm('End this AZAD LIVE broadcast? This will conclude the live stream for all viewers.')) {
      return;
    }

    setStatusMessage('Ending broadcast and flushing stream buffer...');

    // Stop client recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }

    // Call server to terminate FFmpeg and close stream
    if (streamSessionId) {
      try {
        await fetch(`/api/stream/end/${streamSessionId}`, {
          method: 'POST',
          headers: await getAuthHeaders(),
        });
      } catch (e) {
        console.warn('Error ending stream on server:', e);
      }
    }

    setIsStreaming(false);
    setIsConnecting(false);
    setStreamSessionId(null);
    setStreamStartTime(null);
    releaseWakeLock();
    setStatusMessage('Broadcast Ended');
  };

  // Copy YouTube watch link
  const handleCopyLink = () => {
    if (!youtubeWatchUrl) return;
    navigator.clipboard.writeText(youtubeWatchUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  // ==========================================
  // INSTANT REPLAY, CLIPS & RECORDING
  // ==========================================

  const showToast = (message: string) => {
    setToast(message);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  };

  const pickRecorderMime = () => {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a',
      'video/mp4',
    ];
    return candidates.find((c) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) || '';
  };
  const fileExt = (mime: string) => (mime.includes('mp4') ? 'mp4' : 'webm');
  const fileStamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  /** Replays the last `seconds` of camera footage on the output (and optionally saves it as a clip). */
  const handleReplay = (seconds: number, opts?: { speed?: number; caption?: string; auto?: boolean }) => {
    const compositor = compositorRef.current;
    if (!compositor) return;
    const speed = opts?.speed ?? (slowMo ? 0.5 : 1);

    let clipRecorder: MediaRecorder | null = null;
    const clipChunks: Blob[] = [];
    const started = compositor.startReplay({
      seconds,
      speed,
      caption: opts?.caption,
      onEnd: () => {
        setReplayStatus({ active: false, progress: 0, speed: 1 });
        if (clipRecorder && clipRecorder.state !== 'inactive') clipRecorder.stop();
      },
    });

    if (!started) {
      if (!opts?.auto) {
        showToast(isCameraActive ? 'Not enough footage yet. Give it a few seconds.' : 'Turn the camera on to use replays.');
      }
      return;
    }
    setReplayStatus({ active: true, progress: 0, speed });

    if (saveReplayClips && typeof MediaRecorder !== 'undefined') {
      try {
        const mime = pickRecorderMime();
        clipRecorder = new MediaRecorder(compositor.getStream(), mime ? { mimeType: mime, videoBitsPerSecond: 3_000_000 } : undefined);
        clipRecorder.ondataavailable = (e) => e.data.size > 0 && clipChunks.push(e.data);
        clipRecorder.onstop = () => {
          const type = clipRecorder?.mimeType || mime || 'video/webm';
          downloadBlob(new Blob(clipChunks, { type }), `azad-replay-${fileStamp()}.${fileExt(type)}`);
          showToast('Replay clip saved to your downloads');
        };
        clipRecorder.start(500);
      } catch (err) {
        console.warn('Could not record replay clip:', err);
      }
    }
  };
  const handleReplayRef = useRef(handleReplay);
  handleReplayRef.current = handleReplay;

  const handleStopReplay = () => compositorRef.current?.stopReplay();

  // Poll replay progress + buffered footage for the controls
  useEffect(() => {
    const id = setInterval(() => {
      const status = compositorRef.current?.getReplayStatus();
      if (status) {
        setReplayStatus((prev) =>
          prev.active === status.active && Math.abs(prev.progress - status.progress) < 0.01 ? prev : status
        );
      }
      const secs = Math.floor(replayBufferRef.current?.bufferedSeconds || 0);
      setBufferedSeconds((prev) => (prev === secs ? prev : secs));
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Pause buffering while the camera is off (keeps memory flat in simulator mode)
  useEffect(() => {
    replayBufferRef.current?.setPaused(!isCameraActive);
  }, [isCameraActive]);

  useEffect(() => {
    localStorage.setItem('azad_auto_replay', autoReplay ? 'on' : 'off');
  }, [autoReplay]);

  // Auto replay after a FOUR, SIX or WICKET (after the event graphic has played)
  const latestBall = activeMatch?.innings[activeMatch.currentInningsIndex]?.deliveries.slice(-1)[0];
  const lastAutoBallIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const id = latestBall?.id ?? null;
    if (lastAutoBallIdRef.current === undefined || id === lastAutoBallIdRef.current) {
      lastAutoBallIdRef.current = id; // ignore the ball that was already there when the studio opened
      return;
    }
    lastAutoBallIdRef.current = id;
    if (!autoReplay || !latestBall) return;
    const kind = latestBall.isWicket
      ? 'WICKET'
      : latestBall.runsBat === 6 || latestBall.isBoundarySix
      ? 'SIX'
      : latestBall.runsBat === 4 || latestBall.isBoundaryFour
      ? 'FOUR'
      : null;
    if (!kind) return;
    const who = latestBall.isWicket ? latestBall.dismissal?.playerOutName || latestBall.strikerName : latestBall.strikerName;
    const timer = setTimeout(
      () => handleReplayRef.current(10, { speed: 0.5, caption: `${kind} • ${who}`, auto: true }),
      4800
    );
    return () => clearTimeout(timer);
  }, [latestBall?.id, autoReplay]);

  // Record the full broadcast output (video + mic) to files on this device, split every 15 minutes
  const startRecording = () => {
    const compositor = compositorRef.current;
    if (!compositor || typeof MediaRecorder === 'undefined') {
      showToast('Recording is not supported in this browser.');
      return;
    }
    const mime = pickRecorderMime();
    const audioTracks = mediaStreamRef.current?.getAudioTracks() ?? [];
    const stream = new MediaStream([...compositor.getStream().getVideoTracks(), ...audioTracks]);

    const startPart = () => {
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 2_000_000 } : undefined);
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = () => {
        const type = rec.mimeType || mime || 'video/webm';
        downloadBlob(new Blob(chunks, { type }), `azad-match-${fileStamp()}-part${recordPartRef.current}.${fileExt(type)}`);
        recordPartRef.current += 1;
        if (recordContinueRef.current) startPart();
      };
      rec.start(2000);
      recordRecorderRef.current = rec;
    };

    recordContinueRef.current = true;
    recordPartRef.current = 1;
    startPart();
    recordSplitTimerRef.current = setInterval(() => recordRecorderRef.current?.stop(), 15 * 60 * 1000);
    setIsRecording(true);
    setRecordStartedAt(Date.now());
    requestWakeLock();
    showToast('Recording started. Files save automatically every 15 minutes.');
  };

  const stopRecording = () => {
    recordContinueRef.current = false;
    clearInterval(recordSplitTimerRef.current);
    if (recordRecorderRef.current && recordRecorderRef.current.state !== 'inactive') {
      recordRecorderRef.current.stop();
    }
    recordRecorderRef.current = null;
    setIsRecording(false);
    setRecordStartedAt(null);
    if (!isStreaming) releaseWakeLock();
    showToast('Recording saved to your downloads');
  };

  useEffect(() => {
    if (!isRecording || !recordStartedAt) {
      setRecordElapsed('00:00');
      return;
    }
    const id = setInterval(() => {
      const diff = Math.floor((Date.now() - recordStartedAt) / 1000);
      const m = String(Math.floor(diff / 60)).padStart(2, '0');
      const sec = String(diff % 60).padStart(2, '0');
      setRecordElapsed(`${m}:${sec}`);
    }, 1000);
    return () => clearInterval(id);
  }, [isRecording, recordStartedAt]);

  // Stop recording if the studio closes
  useEffect(() => {
    return () => {
      recordContinueRef.current = false;
      clearInterval(recordSplitTimerRef.current);
      if (recordRecorderRef.current && recordRecorderRef.current.state !== 'inactive') recordRecorderRef.current.stop();
    };
  }, []);

  // Does this deployment support relaying to YouTube?
  useEffect(() => {
    fetch('/api/stream/capabilities')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setRelayAvailable(d ? Boolean(d.youtubeRelay) : false))
      .catch(() => setRelayAvailable(false));
  }, []);

  const overlayLinks = selectedMatchId
    ? [
        { key: 'lower_third', label: 'Scoreboard (lower third)', url: `${window.location.origin}?obs=true&matchId=${selectedMatchId}&theme=lower_third` },
        { key: 'event_animation', label: '4 / 6 / Wicket animations', url: `${window.location.origin}?obs=true&matchId=${selectedMatchId}&theme=event_animation` },
        { key: 'scorecard', label: 'Full scorecard', url: `${window.location.origin}?obs=true&matchId=${selectedMatchId}&theme=scorecard` },
      ]
    : [];

  const copyOverlay = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedOverlay(key);
    setTimeout(() => setCopiedOverlay(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-950/60 flex flex-col font-sans overflow-hidden select-none">
      {/* Top Studio Broadcast Bar (compact on phones) */}
      <div className="pt-safe bg-ink-850 border-b border-white/[0.06] flex-shrink-0">
        <div className="px-3 sm:px-4 h-14 flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-ink-950/60 rounded-lg border border-amber-500/40 shrink-0">
            <Radio className={`w-4 h-4 ${isStreaming ? 'text-red-500 animate-pulse' : 'text-amber-400'}`} />
            <span className="font-black text-xs text-amber-400 tracking-wider">
              AZAD <span className="text-red-500">LIVE</span> STUDIO
            </span>
          </div>

          {/* Status pill */}
          <div
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
              isStreaming
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : replayStatus.active
                ? 'bg-pulse-500/20 text-pulse-400 border border-pulse-500/40'
                : isRecording
                ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                : isConnecting
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-white/[0.05] text-slate-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isStreaming || isRecording
                  ? 'bg-red-500 animate-pulse'
                  : replayStatus.active
                  ? 'bg-pulse-400'
                  : isConnecting
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}
            />
            <span>
              {isStreaming
                ? `LIVE ${liveDuration}`
                : replayStatus.active
                ? 'REPLAY'
                : isRecording
                ? `REC ${recordElapsed}`
                : isConnecting
                ? 'CONNECTING'
                : 'PREVIEW'}
            </span>
          </div>

          {isWakeLockActive && (
            <span
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-2 py-0.5 rounded shrink-0"
              title="Screen will stay on during the broadcast"
            >
              <ShieldCheck className="w-3 h-3" />
              Awake
            </span>
          )}

          {/* Match selector */}
          <select
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
            disabled={isStreaming || isRecording}
            aria-label="Match"
            className="min-w-0 flex-1 bg-ink-950/60 border border-white/10 rounded-lg px-2.5 h-9 text-xs text-white font-medium truncate focus:outline-none focus:border-amber-400"
          >
            {Object.values(state.matches).map((m) => (
              <option key={m.id} value={m.id}>
                {m.status === 'live' ? '🔴 ' : ''}
                {m.team1.shortName} vs {m.team2.shortName} · {m.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsLogosModalOpen(true)}
            className="shrink-0 h-9 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5"
            title="Logos & branding"
            aria-label="Logos and branding"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="hidden lg:inline">Logos &amp; Branding</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="shrink-0 h-9 w-9 grid place-items-center rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-300"
            title="Studio settings"
            aria-label="Studio settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={() => {
                if (isStreaming || isRecording) {
                  if (confirm('A broadcast or recording is running. Stop it and exit the studio?')) {
                    if (isRecording) stopRecording();
                    if (isStreaming) handleEndLive();
                    onClose();
                  }
                } else {
                  onClose();
                }
              }}
              className="shrink-0 h-9 w-9 grid place-items-center rounded-lg bg-white/[0.05] hover:bg-red-900/60 text-slate-400 hover:text-white"
              title="Close studio"
              aria-label="Close studio"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {/* Hidden video element for raw camera input */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="hidden"
        />

        {/* Real-Time Compositing Canvas (Exact output streamed to YouTube) */}
        <canvas
          ref={canvasRef}
          className="w-full h-full max-h-screen object-contain bg-black shadow-2xl"
        />

        {/* Camera Permission & MediaDevices Diagnostics Floating Card (Non-blocking: Canvas engine remains active) */}
        {!isCameraActive && !isBannerDismissed && (
          <div className="absolute top-16 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-30 bg-ink-850/95 border border-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-2xl space-y-3.5 transition-all">
            {/* Diagnostic Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div
                  className={`p-2.5 rounded-xl border flex-shrink-0 ${
                    mediaDiagnostics?.category === 'PermissionDenied'
                      ? 'bg-red-500/20 text-red-400 border-red-500/40'
                      : mediaDiagnostics?.category === 'DeviceBusy'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : mediaDiagnostics?.category === 'NotFoundError'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : mediaDiagnostics?.category === 'IframeRestricted'
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  }`}
                >
                  {mediaDiagnostics?.category === 'PermissionDenied' ? (
                    <Lock className="w-5 h-5 text-red-400" />
                  ) : mediaDiagnostics?.category === 'DeviceBusy' ? (
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  ) : mediaDiagnostics?.category === 'IframeRestricted' ? (
                    <ExternalLink className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <VideoOff className="w-5 h-5 text-amber-400" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        mediaDiagnostics?.category === 'PermissionDenied'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : mediaDiagnostics?.category === 'DeviceBusy'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : mediaDiagnostics?.category === 'NotFoundError'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-white/[0.05] text-slate-300 border border-white/10'
                      }`}
                    >
                      {mediaDiagnostics?.badge || 'Camera Offline'}
                    </span>
                    {retryAttempts > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Attempt #{retryAttempts}
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-white mt-1">
                    {mediaDiagnostics?.title || 'Virtual Stadium Active (Demo Mode)'}
                  </h4>
                </div>
              </div>

              {/* Dismiss / Minimize button */}
              <button
                onClick={() => setIsBannerDismissed(true)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                title="Dismiss notice and continue in Virtual Stadium mode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Description */}
            <p className="text-xs text-slate-300 leading-relaxed">
              {mediaDiagnostics?.description ||
                'Currently running in Virtual Stadium Demo Mode with pre-match stadium graphics. Connect a camera or retry access to broadcast real on-ground video.'}
            </p>

            {/* Expandable Troubleshooting Checklist */}
            {mediaDiagnostics?.troubleshootingSteps && mediaDiagnostics.troubleshootingSteps.length > 0 && (
              <div className="bg-ink-950/80 rounded-xl border border-white/[0.06] p-2.5 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowTroubleshootingSteps(!showTroubleshootingSteps)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <span className="flex items-center space-x-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>How to fix this issue ({mediaDiagnostics.troubleshootingSteps.length} steps)</span>
                  </span>
                  {showTroubleshootingSteps ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showTroubleshootingSteps && (
                  <ol className="space-y-1.5 pt-1 text-[11px] text-slate-300 list-none">
                    {mediaDiagnostics.troubleshootingSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="w-4 h-4 rounded-full bg-white/[0.05] border border-white/10 text-amber-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="flex-1 leading-tight">{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {/* Action Buttons Row */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-1">
              {/* Retry Button */}
              <button
                onClick={() => startCamera('standard')}
                disabled={isRetryingCamera}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-md flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetryingCamera ? 'animate-spin' : ''}`} />
                <span>{isRetryingCamera ? 'Checking Hardware...' : 'Retry Camera Access'}</span>
              </button>

              {/* Try Video Only (if audio or mic in use) */}
              {mediaDiagnostics?.canTryRelaxedFallback && (
                <button
                  onClick={() => startCamera('video_only')}
                  disabled={isRetryingCamera}
                  className="py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/10 text-amber-300 font-bold text-xs border border-amber-500/40 flex items-center justify-center space-x-1.5 transition-all"
                  title="Retry video only (bypassing microphone if mic is locked by another app)"
                >
                  <Video className="w-3.5 h-3.5 text-amber-400" />
                  <span>Try Video Only</span>
                </button>
              )}

              {/* Open Standalone Button */}
              {(mediaDiagnostics?.category === 'IframeRestricted' ||
                mediaDiagnostics?.category === 'PermissionDenied' ||
                (typeof window !== 'undefined' && window.self !== window.top)) && (
                <button
                  onClick={() => {
                    const standalone = `${window.location.origin}/?matchId=${selectedMatchId}&portal=cricket`;
                    window.open(standalone, '_blank');
                  }}
                  className="py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/10 text-cyan-300 font-bold text-xs border border-cyan-500/40 flex items-center justify-center space-x-1.5 transition-all"
                  title="Open in new standalone mobile Chrome tab with direct hardware permissions"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Open Standalone</span>
                </button>
              )}

              {/* Use Simulator button */}
              <button
                onClick={() => setIsBannerDismissed(true)}
                className="py-2 px-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 font-bold text-xs border border-white/10 flex items-center justify-center space-x-1 transition-all"
                title="Continue with Virtual Stadium 30fps graphics mode"
              >
                <span>Use Simulator</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Quick Camera Controls (Mobile Friendly Floating Toolbar) */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2 z-20">
          {/* Flip Camera */}
          <button
            onClick={handleToggleCamera}
            disabled={isStreaming}
            className={`p-3 rounded-full backdrop-blur-md border shadow-lg transition-all ${
              isStreaming
                ? 'bg-ink-850/60 border-white/10 text-slate-500 cursor-not-allowed'
                : 'bg-ink-850/80 border-white/10 hover:border-amber-400 text-white'
            }`}
            title="Switch Front/Back Camera"
          >
            <SwitchCamera className="w-5 h-5 text-amber-400" />
          </button>

          {/* Toggle Mic */}
          <button
            onClick={handleToggleMic}
            className={`p-3 rounded-full backdrop-blur-md border shadow-lg transition-all ${
              isMicMuted
                ? 'bg-red-950/80 border-red-700 text-red-400'
                : 'bg-ink-850/80 border-white/10 text-emerald-400'
            }`}
            title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Mic Volume Level Meter (Vertical indicator) */}
          <div
            className="w-3 h-16 bg-ink-950/80 border border-white/[0.06] rounded-full mx-auto overflow-hidden flex flex-col-reverse p-0.5"
            title="Microphone input level"
          >
            <div
              className={`w-full rounded-full transition-all duration-75 ${
                audioLevel > 70
                  ? 'bg-red-500'
                  : audioLevel > 40
                  ? 'bg-yellow-400'
                  : 'bg-emerald-500'
              }`}
              style={{ height: `${isMicMuted ? 0 : audioLevel}%` }}
            />
          </div>
        </div>

        {/* Camera status pill (top-left) */}
        <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
          {/* Re-open Camera Diagnostics Pill when card was dismissed */}
          {isBannerDismissed && !isCameraActive && (
            <button
              onClick={() => setIsBannerDismissed(false)}
              className="px-2.5 py-1 rounded-lg bg-amber-950/90 border border-amber-500/70 hover:border-amber-400 text-[11px] font-bold text-amber-300 backdrop-blur-md shadow flex items-center space-x-1.5 transition-all"
              title="Camera hardware is offline - tap to view troubleshooting guide or retry connection"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Camera: {mediaDiagnostics?.badge || 'Simulator Mode'}</span>
            </button>
          )}

        </div>

        {/* YouTube Watch URL Banner (when live or configured) */}
        {youtubeWatchUrl && (
          <div className="absolute bottom-28 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-20 bg-ink-850/90 border border-amber-500/60 backdrop-blur-md rounded-xl p-3 shadow-2xl flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Tv className="w-3 h-3" /> YouTube Live Viewer Link
              </span>
              <p className="text-xs text-white truncate font-mono mt-0.5">{youtubeWatchUrl}</p>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center space-x-1"
                title="Copy Live URL"
              >
                {copiedUrl ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{copiedUrl ? 'Copied' : 'Copy'}</span>
              </button>
              <a
                href={youtubeWatchUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-300"
                title="Open in YouTube"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-48 sm:bottom-40 z-40 max-w-[90vw] px-4 py-2 rounded-full bg-ink-950/90 border border-white/10 text-xs font-semibold text-white shadow-2xl backdrop-blur">
          {toast}
        </div>
      )}

      {/* Bottom controls: instant replay dock + record / go live (large touch targets) */}
      <div className="bg-ink-850 border-t border-white/[0.06] z-30 flex-shrink-0 pb-safe">
        {/* Replay dock */}
        <div className="px-3 sm:px-4 pt-3">
          <div className="max-w-4xl mx-auto">
            {replayStatus.active ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span className="text-pulse-400 flex items-center gap-1.5">
                      <Rewind className="w-3.5 h-3.5" />
                      {replayStatus.speed < 1 ? `SLOW-MO REPLAY ${replayStatus.speed}x` : 'REPLAY'} ON AIR
                    </span>
                    <span className="text-slate-500">{Math.round(replayStatus.progress * 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-400 to-pulse-500 transition-[width] duration-200"
                      style={{ width: `${replayStatus.progress * 100}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleStopReplay}
                  className="shrink-0 h-11 px-4 rounded-xl bg-white text-ink-950 font-black text-xs flex items-center gap-1.5 active:scale-95"
                >
                  <Radio className="w-4 h-4" /> Back to live
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
                <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 pr-1">
                  <Rewind className="w-3.5 h-3.5" /> Replay
                </span>
                {[10, 20, 30].map((secs) => {
                  const ready = isCameraActive && bufferedSeconds >= Math.min(secs, 5);
                  return (
                    <button
                      key={secs}
                      onClick={() => handleReplay(secs)}
                      disabled={!isCameraActive}
                      className={`shrink-0 h-11 min-w-[64px] px-3 rounded-xl font-black text-sm border transition-all active:scale-95 ${
                        ready
                          ? 'bg-gradient-to-br from-brand-500/25 to-pulse-500/25 border-brand-400/50 text-white'
                          : 'bg-white/[0.03] border-white/[0.06] text-slate-500'
                      }`}
                      title={`Replay the last ${secs} seconds`}
                    >
                      {secs}s
                    </button>
                  );
                })}
                <button
                  onClick={() => setSlowMo((v) => !v)}
                  className={`shrink-0 h-11 px-3 rounded-xl text-xs font-bold border flex items-center gap-1.5 active:scale-95 ${
                    slowMo ? 'bg-trophy-500/20 border-trophy-400/60 text-trophy-300' : 'bg-white/[0.03] border-white/[0.08] text-slate-300'
                  }`}
                  aria-pressed={slowMo}
                  title="Play replays in slow motion (0.5x)"
                >
                  <Gauge className="w-4 h-4" /> Slow-mo
                </button>
                <button
                  onClick={() => setAutoReplay((v) => !v)}
                  className={`shrink-0 h-11 px-3 rounded-xl text-xs font-bold border flex items-center gap-1.5 active:scale-95 ${
                    autoReplay ? 'bg-pitch-500/15 border-pitch-500/50 text-pitch-400' : 'bg-white/[0.03] border-white/[0.08] text-slate-300'
                  }`}
                  aria-pressed={autoReplay}
                  title="Automatically replay 4s, 6s and wickets in slow motion"
                >
                  <Sparkles className="w-4 h-4" /> Auto 4·6·W
                </button>
                <button
                  onClick={() => setSaveReplayClips((v) => !v)}
                  className={`shrink-0 h-11 px-3 rounded-xl text-xs font-bold border flex items-center gap-1.5 active:scale-95 ${
                    saveReplayClips ? 'bg-brand-500/15 border-brand-400/50 text-brand-300' : 'bg-white/[0.03] border-white/[0.08] text-slate-300'
                  }`}
                  aria-pressed={saveReplayClips}
                  title="Save each replay as a video clip on this device"
                >
                  <Download className="w-4 h-4" /> Save clips
                </button>
                <span className="shrink-0 text-[10px] text-slate-500 font-mono pl-1">
                  {isCameraActive ? `${bufferedSeconds}s buffered` : 'camera off'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Record + Go live */}
        <div className="p-3 sm:px-4">
          <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3">
            {isStreaming && (
              <div className="hidden sm:flex items-center gap-3 text-xs mr-auto">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Wifi
                    className={`w-3.5 h-3.5 ${
                      streamHealth === 'excellent'
                        ? 'text-emerald-400'
                        : streamHealth === 'good'
                        ? 'text-cyan-400'
                        : streamHealth === 'fair'
                        ? 'text-amber-400'
                        : 'text-red-500 animate-pulse'
                    }`}
                  />
                  <strong className="text-white capitalize">{streamHealth}</strong>
                </span>
                <span className="text-slate-400">
                  <strong className="text-white font-mono">{uploadBitrateKbps}</strong> kbps
                </span>
                <span className="text-amber-400 uppercase font-mono font-bold">{qualityPreset}</span>
              </div>
            )}

            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`h-12 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 border active:scale-95 transition-all ${
                isRecording
                  ? 'bg-red-600/20 border-red-500/60 text-red-300'
                  : 'bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.08]'
              }`}
              title={isRecording ? 'Stop recording and save' : 'Record the broadcast to this device'}
            >
              {isRecording ? <Square className="w-4 h-4 fill-red-500 text-red-500" /> : <Circle className="w-4 h-4 fill-red-500 text-red-500" />}
              <span>{isRecording ? `Stop ${recordElapsed}` : 'Record'}</span>
            </button>

            {!isStreaming ? (
              <button
                onClick={handleStartLive}
                disabled={isConnecting}
                className={`flex-1 sm:flex-none sm:ml-auto h-12 px-6 rounded-xl font-black text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                  isConnecting
                    ? 'bg-amber-600/80 text-white cursor-wait'
                    : 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:brightness-110 text-white shadow-red-950/50'
                }`}
              >
                <Radio className="w-5 h-5" />
                <span>{isConnecting ? 'CONNECTING…' : 'GO LIVE'}</span>
              </button>
            ) : (
              <button
                onClick={handleEndLive}
                className="flex-1 sm:flex-none sm:ml-auto h-12 px-6 rounded-xl font-black text-sm tracking-wide bg-gradient-to-r from-red-700 to-ink-850 text-white border border-red-500/40 shadow-xl flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Square className="w-5 h-5 fill-red-500 text-red-500" />
                <span>END LIVE</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* "Go live with a streaming app" guide (used when this deployment can't relay to YouTube) */}
      {isGoLiveGuideOpen && (
        <div className="absolute inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsGoLiveGuideOpen(false)} />
          <div className="relative w-full sm:max-w-lg max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-ink-850 border border-white/10 shadow-2xl pb-safe">
            <div className="shrink-0 px-5 pt-4 pb-3 border-b border-white/[0.06] flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400">Go live on YouTube</div>
                <h3 className="font-display text-2xl font-semibold text-white leading-tight mt-0.5">Stream with a streaming app</h3>
                <p className="text-xs text-slate-400 mt-1">
                  This server can’t send video to YouTube directly. Use a free streaming app and add AZAD LIVE’s live
                  scoreboard to it with the links below. Scores update automatically.
                </p>
              </div>
              <button onClick={() => setIsGoLiveGuideOpen(false)} className="p-2 rounded-full bg-white/5 shrink-0" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">
              <div className="space-y-2">
                <div className="text-xs font-bold text-white">1. Copy an overlay link for this match</div>
                {overlayLinks.length === 0 ? (
                  <p className="text-xs text-slate-500">Pick a match at the top first.</p>
                ) : (
                  overlayLinks.map((o) => (
                    <div key={o.key} className="flex items-center gap-2 p-2.5 rounded-xl bg-ink-950/60 border border-white/[0.06]">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-200">{o.label}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{o.url}</div>
                      </div>
                      <button
                        onClick={() => copyOverlay(o.key, o.url)}
                        className="shrink-0 h-9 px-3 rounded-lg bg-amber-500 text-black text-xs font-bold flex items-center gap-1"
                      >
                        {copiedOverlay === o.key ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedOverlay === o.key ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="grid gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Smartphone className="w-4 h-4 text-brand-300" /> From a phone
                  </div>
                  <ol className="mt-2 space-y-1 text-[11px] text-slate-400 list-decimal pl-4">
                    <li>Install a streaming app that supports web overlays (for example PRISM Live Studio).</li>
                    <li>Sign in with the YouTube channel and create a live stream.</li>
                    <li>Add a <strong className="text-slate-200">Web / Browser widget</strong> and paste the scoreboard link.</li>
                    <li>Go live from the app. Keep scoring in AZAD LIVE on another phone.</li>
                  </ol>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Monitor className="w-4 h-4 text-pulse-400" /> From a laptop (OBS)
                  </div>
                  <ol className="mt-2 space-y-1 text-[11px] text-slate-400 list-decimal pl-4">
                    <li>In OBS, add your camera, then <strong className="text-slate-200">+ Browser</strong> source.</li>
                    <li>Paste the link, set size to 1920 × 1080.</li>
                    <li>Settings → Stream → YouTube, then Start Streaming.</li>
                  </ol>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Tip: this studio still works for <strong className="text-slate-300">instant replays</strong> and{' '}
                <strong className="text-slate-300">recording</strong> on this phone, with the scoreboard burned into the video.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Settings Drawer / Slide-Over Modal */}
      {isSettingsOpen && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-96 bg-ink-850 border-l border-white/[0.06] z-50 p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="font-black text-white text-base flex items-center space-x-2">
              <Settings className="w-5 h-5 text-amber-400" />
              <span>Broadcast Studio Settings</span>
            </h3>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* YouTube Stream Key */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              YouTube Stream Key (RTMPS)
            </label>
            <div className="relative">
              <input
                type={showStreamKey ? 'text' : 'password'}
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
                className="w-full bg-ink-950/60 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white pr-10 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowStreamKey(!showStreamKey)}
                className="absolute right-2 top-2 text-slate-400 hover:text-white text-xs"
              >
                {showStreamKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Get from <strong>YouTube Studio &gt; Go Live &gt; Stream Key</strong>. If left blank, the server will use its configured default key.
            </p>
          </div>

          {/* Optional Broadcast ID */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              YouTube Video ID / Custom URL (Optional)
            </label>
            <input
              type="text"
              value={customBroadcastId}
              onChange={(e) => setCustomBroadcastId(e.target.value)}
              placeholder="e.g. dQw4w9WgXcQ"
              className="w-full bg-ink-950/60 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Resolution Preset */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Stream Resolution & Bitrate
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['480p', '720p', '1080p'] as StreamQualityPreset[]).map((p) => (
                <button
                  key={p}
                  disabled={isStreaming}
                  onClick={() => setQualityPreset(p)}
                  className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all text-center ${
                    qualityPreset === p
                      ? 'bg-amber-500 text-black border-amber-400'
                      : 'bg-ink-950/60 text-slate-300 border-white/10 hover:border-slate-500'
                  }`}
                >
                  {p}
                  <span className="block text-[10px] font-normal opacity-80">
                    {p === '480p' ? '1.2 Mbps' : p === '720p' ? '2.5 Mbps' : '4.5 Mbps'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Camera Selection */}
          {availableCameras.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Camera Device
              </label>
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                disabled={isStreaming}
                className="w-full bg-ink-950/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
              >
                {availableCameras.map((cam, idx) => (
                  <option key={cam.deviceId || idx} value={cam.deviceId}>
                    {cam.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Overlay Toggles */}
          <div className="space-y-3 pt-3 border-t border-white/[0.06]">
            <label className="text-xs font-bold text-slate-300 block">
              Broadcast Overlay Graphics
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Dynamic Scoreboard Lower-Third</span>
              <input
                type="checkbox"
                checked={showScoreboard}
                onChange={(e) => setShowScoreboard(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>AZAD LIVE Brand Watermark</span>
              <input
                type="checkbox"
                checked={showWatermark}
                onChange={(e) => setShowWatermark(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>4, 6 &amp; Wicket Pop-up Alerts</span>
              <input
                type="checkbox"
                checked={showEventAlerts}
                onChange={(e) => setShowEventAlerts(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded"
              />
            </label>
          </div>

          {/* Test the on-screen graphics */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">Test graphics</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => compositorRef.current?.triggerEvent('boundary_four')}
                className="h-10 rounded-lg bg-blue-950/80 border border-blue-700/60 text-xs font-bold text-blue-300"
              >
                Four
              </button>
              <button
                onClick={() => compositorRef.current?.triggerEvent('boundary_six')}
                className="h-10 rounded-lg bg-amber-950/80 border border-amber-700/60 text-xs font-bold text-amber-300"
              >
                Six
              </button>
              <button
                onClick={() => compositorRef.current?.triggerEvent('wicket')}
                className="h-10 rounded-lg bg-red-950/80 border border-red-700/60 text-xs font-bold text-red-300"
              >
                Wicket
              </button>
            </div>
          </div>

          {/* Mobile Screen Guidance */}
          <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 text-[11px] text-amber-300/90 space-y-1">
            <span className="font-bold flex items-center gap-1 text-amber-300">
              <AlertCircle className="w-3.5 h-3.5" /> Mobile Broadcaster Notice
            </span>
            <p>
              AZAD LIVE will request screen wake lock so your phone display stays awake. Avoid locking your phone or leaving this browser tab during live stream to maintain smooth 30fps YouTube broadcast.
            </p>
          </div>
        </div>
      )}

      {/* Gallery Logos & Branding Drawer */}
      {isLogosModalOpen && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-96 bg-ink-850 border-l border-white/[0.06] z-50 p-5 overflow-y-auto space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="font-black text-white text-base flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Logos &amp; Broadcast Graphics</span>
            </h3>
            <button
              onClick={() => setIsLogosModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Pick high-resolution logos from your phone or gallery (PNG, JPG, WebP up to 5MB). These logos are rendered in 30fps onto the live video streamed directly to YouTube.
          </p>

          {/* 1. KPL 5 / Tournament Logo */}
          <div className="p-3 bg-ink-950/60 rounded-xl border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-400">
                Tournament / KPL Logo
              </label>
              {customLogos.tournamentLogo && (
                <button
                  onClick={() => handleRemoveLogo('tournamentLogo')}
                  className="text-red-400 hover:text-red-300 text-[11px] font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 rounded-lg bg-ink-850 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {customLogos.tournamentLogo ? (
                  <img
                    src={customLogos.tournamentLogo}
                    alt="Tournament"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-600" />
                )}
              </div>

              <label className="flex-1 cursor-pointer">
                <span className="inline-flex items-center justify-center space-x-1.5 w-full px-3 py-2 bg-white/[0.05] hover:bg-white/10 text-white rounded-lg text-xs font-bold border border-white/15 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>{customLogos.tournamentLogo ? 'Replace Logo' : 'Select from Gallery'}</span>
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleLogoUpload('tournamentLogo', e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* 2. Team 1 Logo */}
          {activeMatch && (
            <div className="p-3 bg-ink-950/60 rounded-xl border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">
                  Team 1: {activeMatch.team1.name}
                </label>
                {customLogos.team1Logo && (
                  <button
                    onClick={() => handleRemoveLogo('team1Logo')}
                    className="text-red-400 hover:text-red-300 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 rounded-lg bg-ink-850 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {customLogos.team1Logo ? (
                    <img
                      src={customLogos.team1Logo}
                      alt="Team 1"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-600" />
                  )}
                </div>

                <label className="flex-1 cursor-pointer">
                  <span className="inline-flex items-center justify-center space-x-1.5 w-full px-3 py-2 bg-white/[0.05] hover:bg-white/10 text-white rounded-lg text-xs font-bold border border-white/15 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{customLogos.team1Logo ? 'Replace Logo' : 'Select Team 1 Logo'}</span>
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleLogoUpload('team1Logo', e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* 3. Team 2 Logo */}
          {activeMatch && (
            <div className="p-3 bg-ink-950/60 rounded-xl border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">
                  Team 2: {activeMatch.team2.name}
                </label>
                {customLogos.team2Logo && (
                  <button
                    onClick={() => handleRemoveLogo('team2Logo')}
                    className="text-red-400 hover:text-red-300 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 rounded-lg bg-ink-850 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {customLogos.team2Logo ? (
                    <img
                      src={customLogos.team2Logo}
                      alt="Team 2"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-600" />
                  )}
                </div>

                <label className="flex-1 cursor-pointer">
                  <span className="inline-flex items-center justify-center space-x-1.5 w-full px-3 py-2 bg-white/[0.05] hover:bg-white/10 text-white rounded-lg text-xs font-bold border border-white/15 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-rose-400" />
                    <span>{customLogos.team2Logo ? 'Replace Logo' : 'Select Team 2 Logo'}</span>
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleLogoUpload('team2Logo', e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* 4. Sponsor Branding */}
          <div className="p-3 bg-ink-950/60 rounded-xl border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-400">
                Sponsor Logo &amp; Tagline
              </label>
              {customLogos.sponsorLogo && (
                <button
                  onClick={() => handleRemoveLogo('sponsorLogo')}
                  className="text-red-400 hover:text-red-300 text-[11px] font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 rounded-lg bg-ink-850 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {customLogos.sponsorLogo ? (
                  <img
                    src={customLogos.sponsorLogo}
                    alt="Sponsor"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-600" />
                )}
              </div>

              <label className="flex-1 cursor-pointer">
                <span className="inline-flex items-center justify-center space-x-1.5 w-full px-3 py-2 bg-white/[0.05] hover:bg-white/10 text-white rounded-lg text-xs font-bold border border-white/15 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>{customLogos.sponsorLogo ? 'Replace Sponsor Logo' : 'Select Sponsor Logo'}</span>
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleLogoUpload('sponsorLogo', e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Sponsor Tagline / Attribution
              </label>
              <input
                type="text"
                value={customLogos.sponsorTagline || ''}
                onChange={(e) => handleUpdateSponsorTagline(e.target.value)}
                placeholder="e.g. Powered by Azad Sports"
                className="w-full bg-ink-850 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* 5. Scoreboard Position & Logo Scaling */}
          <div className="p-3 bg-ink-950/60 rounded-xl border border-white/[0.06] space-y-4">
            <label className="text-xs font-bold text-amber-400 block">
              Layout &amp; Sizing Controls
            </label>

            {/* Scoreboard Position */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                Scoreboard Position on Stream
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateScoreboardPosition('bottom')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                    (customLogos.scoreboardPosition || 'bottom') === 'bottom'
                      ? 'bg-amber-500 text-black border-amber-400'
                      : 'bg-ink-850 text-slate-300 border-white/10 hover:border-white/15'
                  }`}
                >
                  Bottom (Lower-Third)
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateScoreboardPosition('top')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                    customLogos.scoreboardPosition === 'top'
                      ? 'bg-amber-500 text-black border-amber-400'
                      : 'bg-ink-850 text-slate-300 border-white/10 hover:border-white/15'
                  }`}
                >
                  Top (Header Bar)
                </button>
              </div>
            </div>

            {/* Logo Scale Slider */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                <span>Logo Scale</span>
                <span className="text-amber-400 font-mono font-bold">
                  {(customLogos.logoScale || 1.0).toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.4"
                step="0.1"
                value={customLogos.logoScale || 1.0}
                onChange={(e) => handleUpdateLogoScale(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>Small (0.7x)</span>
                <span>Normal (1.0x)</span>
                <span>Large (1.4x)</span>
              </div>
            </div>

            {/* Save as Tournament Default */}
            <div className="pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={handleSaveAsDefault}
                className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-xl shadow flex items-center justify-center space-x-1.5 transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-black" />
                <span>Save as Tournament Default</span>
              </button>
              <p className="text-[10px] text-slate-400 mt-1 text-center">
                Saves current tournament, sponsor &amp; layout choices across all matches.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
