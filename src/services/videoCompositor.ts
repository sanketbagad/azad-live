import { Match, BallDelivery, CustomStreamLogos } from '../types/cricket';
import { calculateRunRate, calculateRequiredRunRate } from '../utils/cricketEngine';
import type { ReplayBuffer, ReplayFrame } from './replayBuffer';

// In-memory HTML image cache for smooth 30fps canvas rendering
const imageElementCache = new Map<string, HTMLImageElement>();

function getCachedImage(url?: string): HTMLImageElement | null {
  if (!url) return null;
  let img = imageElementCache.get(url);
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    imageElementCache.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export interface CompositorOptions {
  width: number;
  height: number;
  fps?: number;
  showScoreboard?: boolean;
  showWatermark?: boolean;
  showRecentBalls?: boolean;
  showEventAlerts?: boolean;
  customLogos?: CustomStreamLogos;
  /** Instant-replay buffer (owned by the caller so it survives compositor restarts) */
  replayBuffer?: ReplayBuffer;
}

export interface ReplayRequest {
  /** How many seconds of footage to replay */
  seconds: number;
  /** Playback speed: 1 = real time, 0.5 = slow motion */
  speed?: number;
  /** Caption shown on the replay graphic, e.g. "SIX • Rohit" */
  caption?: string;
  onEnd?: () => void;
}

export interface ReplayStatus {
  active: boolean;
  /** 0..1 */
  progress: number;
  speed: number;
}

export interface CompositorController {
  stop: () => void;
  getCanvas: () => HTMLCanvasElement;
  getStream: () => MediaStream;
  triggerEvent: (type: 'boundary_four' | 'boundary_six' | 'wicket', text?: string) => void;
  /** Starts an instant replay of buffered camera footage. Returns false if there isn't enough footage. */
  startReplay: (request: ReplayRequest) => boolean;
  stopReplay: () => void;
  getReplayStatus: () => ReplayStatus;
}

const REPLAY_STINGER_MS = 550;

export function createVideoCompositor(
  videoElement: HTMLVideoElement | null,
  canvasElement: HTMLCanvasElement,
  getMatch: () => Match | null,
  options: CompositorOptions
): CompositorController {
  const width = options.width || 1280;
  const height = options.height || 720;
  const fps = options.fps || 30;

  canvasElement.width = width;
  canvasElement.height = height;
  const ctx = canvasElement.getContext('2d', { alpha: false });

  let isRunning = true;
  let animationFrameId: number;

  // Active delivery event alert state
  let lastProcessedDeliveryId: string | null = null;
  let activeEvent: {
    type: 'boundary_four' | 'boundary_six' | 'wicket';
    text: string;
    subText: string;
    startTime: number;
    duration: number;
  } | null = null;

  function triggerEvent(type: 'boundary_four' | 'boundary_six' | 'wicket', text?: string) {
    let title = text || 'EVENT';
    let subtitle = '';
    if (type === 'boundary_six') {
      title = text || '🚀 MAXIMUM SIX! (6)';
      subtitle = 'MASSIVE HIT OUT OF THE PARK';
    } else if (type === 'boundary_four') {
      title = text || '🔥 CRACKING FOUR! (4)';
      subtitle = 'RACED AWAY TO THE BOUNDARY';
    } else if (type === 'wicket') {
      title = text || '⚡ WICKET! OUT';
      subtitle = 'BIG BREAKTHROUGH FOR THE BOWLING TEAM';
    }

    activeEvent = {
      type,
      text: title,
      subText: subtitle,
      startTime: performance.now(),
      duration: 4500, // 4.5 seconds
    };
  }

  // ---------- Instant replay playback ----------
  let replay: {
    frames: ReplayFrame[];
    speed: number;
    caption: string;
    startedAt: number;
    endedAt: number | null;
    frameIdx: number;
    loadedIdx: number;
    bitmap: ImageBitmap | null;
    decoding: boolean;
    onEnd?: () => void;
  } | null = null;

  function startReplay(request: ReplayRequest): boolean {
    const frames = options.replayBuffer?.snapshot(request.seconds) || [];
    if (frames.length < 5) return false;
    finishReplay(false);
    replay = {
      frames,
      speed: request.speed || 1,
      caption: request.caption || '',
      startedAt: performance.now(),
      endedAt: null,
      frameIdx: 0,
      loadedIdx: -1,
      bitmap: null,
      decoding: false,
      onEnd: request.onEnd,
    };
    return true;
  }

  function finishReplay(notify = true) {
    if (!replay) return;
    const done = replay;
    replay = null;
    done.bitmap?.close?.();
    if (notify) done.onEnd?.();
  }

  function replayDurationMs(r: NonNullable<typeof replay>) {
    return (r.frames[r.frames.length - 1].t - r.frames[0].t) / r.speed;
  }

  function getReplayStatus(): ReplayStatus {
    if (!replay) return { active: false, progress: 0, speed: 1 };
    const total = replayDurationMs(replay) || 1;
    const progress = Math.min(1, (performance.now() - replay.startedAt) / total);
    return { active: true, progress, speed: replay.speed };
  }

  /** Draws the current replay frame. Returns false once the replay has finished. */
  function drawReplay(time: number): boolean {
    const r = replay;
    if (!r || !ctx) return false;
    const footageMs = (time - r.startedAt) * r.speed;
    const target = r.frames[0].t + footageMs;
    const last = r.frames[r.frames.length - 1];

    // Outro: hold the last frame under the closing stinger, then return to live
    if (target > last.t) {
      if (r.endedAt === null) r.endedAt = time;
      if (time - r.endedAt > REPLAY_STINGER_MS) {
        finishReplay(true);
        return false;
      }
    }

    while (r.frameIdx < r.frames.length - 1 && r.frames[r.frameIdx + 1].t <= target) r.frameIdx++;

    if (r.frameIdx !== r.loadedIdx && !r.decoding) {
      const idx = r.frameIdx;
      r.decoding = true;
      createImageBitmap(r.frames[idx].blob)
        .then((bmp) => {
          if (replay !== r) {
            bmp.close();
            return;
          }
          r.bitmap?.close();
          r.bitmap = bmp;
          r.loadedIdx = idx;
        })
        .catch(() => {})
        .finally(() => {
          r.decoding = false;
        });
    }

    if (r.bitmap) {
      ctx.drawImage(r.bitmap, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, width, height);
    }
    return true;
  }

  function drawReplayGraphics(time: number) {
    const r = replay;
    if (!r || !ctx) return;
    const s = height / 720;
    const total = replayDurationMs(r) || 1;
    const progress = Math.min(1, (time - r.startedAt) / total);

    // Slight vignette so it reads as "not live"
    const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, height * 0.9);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // REPLAY bug (top-left)
    const bugX = Math.round(24 * s);
    const bugY = Math.round(24 * s);
    const bugH = Math.round(44 * s);
    const label = r.speed < 1 ? 'SLOW-MO REPLAY' : 'REPLAY';
    ctx.font = `900 ${Math.round(22 * s)}px 'Inter', sans-serif`;
    const labelW = ctx.measureText(label).width;
    const bugW = Math.round(labelW + 76 * s);
    ctx.fillStyle = 'rgba(5,7,15,0.82)';
    roundRect(ctx, bugX, bugY, bugW, bugH, 10 * s);
    ctx.fill();
    const grad = ctx.createLinearGradient(bugX, 0, bugX + bugW, 0);
    grad.addColorStop(0, '#06b6d4');
    grad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = grad;
    roundRect(ctx, bugX, bugY, Math.round(44 * s), bugH, 10 * s);
    ctx.fill();
    // Rewind icon
    ctx.fillStyle = '#fff';
    const ix = bugX + 22 * s;
    const iy = bugY + bugH / 2;
    ctx.beginPath();
    ctx.moveTo(ix + 2 * s, iy - 9 * s);
    ctx.lineTo(ix - 7 * s, iy);
    ctx.lineTo(ix + 2 * s, iy + 9 * s);
    ctx.moveTo(ix + 11 * s, iy - 9 * s);
    ctx.lineTo(ix + 2 * s, iy);
    ctx.lineTo(ix + 11 * s, iy + 9 * s);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bugX + 56 * s, iy + 1 * s);

    if (r.speed < 1) {
      ctx.font = `800 ${Math.round(14 * s)}px 'Inter', sans-serif`;
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`${r.speed}x`, bugX + bugW + 10 * s, iy + 1 * s);
    }
    if (r.caption) {
      ctx.font = `700 ${Math.round(16 * s)}px 'Inter', sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText(r.caption, bugX, bugY + bugH + 18 * s);
    }

    // Progress bar along the top edge
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(0, 0, width, Math.max(3, 5 * s));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width * progress, Math.max(3, 5 * s));

    // Stinger wipe on the way in and out
    const sinceStart = time - r.startedAt;
    const sinceEnd = r.endedAt === null ? null : time - r.endedAt;
    let wipe: number | null = null;
    if (sinceStart < REPLAY_STINGER_MS) wipe = 1 - sinceStart / REPLAY_STINGER_MS;
    else if (sinceEnd !== null) wipe = Math.min(1, sinceEnd / REPLAY_STINGER_MS);
    if (wipe !== null && wipe > 0) drawStinger(ctx, width, height, wipe);
  }

  function render(time: number) {
    if (!isRunning || !ctx) return;

    const videoReady = Boolean(
      videoElement && videoElement.readyState >= 2 && videoElement.videoWidth > 0 && videoElement.videoHeight > 0
    );
    // Keep buffering live camera footage, even while a replay is on screen
    if (videoReady && options.replayBuffer) {
      options.replayBuffer.capture(videoElement!, videoElement!.videoWidth, videoElement!.videoHeight, time);
    }

    // 1. Draw replay, live video, or the virtual stadium background
    if (replay && drawReplay(time)) {
      // replay frame drawn
    } else if (videoReady && videoElement) {
      const vWidth = videoElement.videoWidth;
      const vHeight = videoElement.videoHeight;
      const videoRatio = vWidth / vHeight;
      const canvasRatio = width / height;

      let drawWidth = width;
      let drawHeight = height;
      let offsetX = 0;
      let offsetY = 0;

      if (videoRatio > canvasRatio) {
        // Video is wider than canvas
        drawWidth = height * videoRatio;
        offsetX = (width - drawWidth) / 2;
      } else {
        // Video is taller than canvas (e.g. mobile portrait camera)
        drawHeight = width / videoRatio;
        offsetY = (height - drawHeight) / 2;
      }

      ctx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight);
    } else {
      // Virtual Stadium Night Turf Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#06131f');
      bgGrad.addColorStop(0.35, '#0a2333');
      bgGrad.addColorStop(0.65, '#0b3528');
      bgGrad.addColorStop(1, '#052219');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Pitch strip perspective
      ctx.fillStyle = '#bfa176';
      ctx.beginPath();
      ctx.moveTo(width * 0.44, height * 0.45);
      ctx.lineTo(width * 0.56, height * 0.45);
      ctx.lineTo(width * 0.62, height * 0.85);
      ctx.lineTo(width * 0.38, height * 0.85);
      ctx.closePath();
      ctx.fill();

      // Crease lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width * 0.42, height * 0.52);
      ctx.lineTo(width * 0.58, height * 0.52);
      ctx.moveTo(width * 0.39, height * 0.78);
      ctx.lineTo(width * 0.61, height * 0.78);
      ctx.stroke();

      // Stadium Floodlight glows
      const pulse = Math.sin(time / 400) * 0.15 + 0.85;
      const leftLight = ctx.createRadialGradient(width * 0.15, height * 0.15, 10, width * 0.15, height * 0.15, width * 0.3);
      leftLight.addColorStop(0, `rgba(255, 230, 180, ${0.4 * pulse})`);
      leftLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = leftLight;
      ctx.fillRect(0, 0, width * 0.4, height * 0.4);

      const rightLight = ctx.createRadialGradient(width * 0.85, height * 0.15, 10, width * 0.85, height * 0.15, width * 0.3);
      rightLight.addColorStop(0, `rgba(255, 230, 180, ${0.4 * pulse})`);
      rightLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rightLight;
      ctx.fillRect(width * 0.6, 0, width * 0.4, height * 0.4);

      // Virtual broadcast center label (Clearly labeled as DEMO / PRE-MATCH GRAPHICS)
      ctx.fillStyle = '#F59E0B';
      ctx.font = `900 ${Math.round(height * 0.026)}px 'Inter', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('AZAD LIVE • [DEMO / SIMULATOR MODE]', width / 2, height * 0.46);

      ctx.fillStyle = '#94A3B8';
      ctx.font = `600 ${Math.round(height * 0.018)}px 'Inter', sans-serif`;
      ctx.fillText('PRE-MATCH BROADCAST GRAPHICS • CONNECT CAMERA FOR REAL ON-GROUND VIDEO', width / 2, height * 0.50);
    }

    const match = getMatch();

    // Check for automatic new delivery trigger (4, 6, Wicket)
    if (match) {
      const currentInn = match.innings[match.currentInningsIndex];
      if (currentInn && currentInn.deliveries.length > 0) {
        const latestBall = currentInn.deliveries[currentInn.deliveries.length - 1];
        if (latestBall.id !== lastProcessedDeliveryId) {
          lastProcessedDeliveryId = latestBall.id;
          if (latestBall.isWicket) {
            triggerEvent('wicket', `⚡ WICKET! ${latestBall.dismissal?.playerOutName || latestBall.strikerName} OUT`);
          } else if (latestBall.runsBat === 6 || latestBall.isBoundarySix) {
            triggerEvent('boundary_six', `🚀 MAXIMUM SIX! • ${latestBall.strikerName}`);
          } else if (latestBall.runsBat === 4 || latestBall.isBoundaryFour) {
            triggerEvent('boundary_four', `🔥 FOUR! • ${latestBall.strikerName}`);
          }
        }
      }
    }

    // 2. Draw Top Watermark & Live Bug
    if (options.showWatermark !== false) {
      drawTopWatermark(ctx, width, height, match, time, options);
    }

    // 3. Draw Bottom Broadcast Scoreboard Lower-Third
    if (options.showScoreboard !== false && match) {
      drawScoreboardLowerThird(ctx, width, height, match, options);
    }

    // 3b. Replay graphics (bug, progress, stinger)
    if (replay) {
      drawReplayGraphics(time);
    }

    // 4. Draw Animated Event Splash (4, 6, Wicket)
    if (options.showEventAlerts !== false && activeEvent && !replay) {
      const elapsed = time - activeEvent.startTime;
      if (elapsed < activeEvent.duration) {
        drawEventAnimationSplash(ctx, width, height, activeEvent, elapsed);
      } else {
        activeEvent = null;
      }
    }

    animationFrameId = requestAnimationFrame(render);
  }

  animationFrameId = requestAnimationFrame(render);

  const stream = canvasElement.captureStream(fps);

  return {
    stop: () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      finishReplay(false);
    },
    getCanvas: () => canvasElement,
    getStream: () => stream,
    triggerEvent,
    startReplay,
    stopReplay: () => finishReplay(true),
    getReplayStatus,
  };
}

/** Diagonal brand-colored wipe used when entering/leaving a replay. amount: 0 (none) .. 1 (full) */
function drawStinger(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  const eased = amount * amount * (3 - 2 * amount);
  const span = width + height;
  const x = -height + span * eased;
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#06b6d4');
  grad.addColorStop(1, '#7c3aed');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-height, 0);
  ctx.lineTo(x + height * 0.3, 0);
  ctx.lineTo(x - height * 0.3, height);
  ctx.lineTo(-height, height);
  ctx.closePath();
  ctx.fill();
  if (eased > 0.55) {
    ctx.globalAlpha = Math.min(1, (eased - 0.55) / 0.3);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(height * 0.075)}px 'Inter', sans-serif`;
    ctx.fillText('AZAD LIVE', width / 2, height / 2 - height * 0.03);
    ctx.font = `800 ${Math.round(height * 0.035)}px 'Inter', sans-serif`;
    ctx.fillText('ACTION REPLAY', width / 2, height / 2 + height * 0.045);
  }
  ctx.restore();
}

/**
 * Top Watermark and Tournament Badge
 */
function drawTopWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  match: Match | null,
  time: number,
  options: CompositorOptions
) {
  const pad = Math.round(width * 0.02);
  const badgeH = Math.round(height * 0.055);
  const badgeW = Math.round(width * 0.28);

  // Top Left: AZAD LIVE Broadcast Badge
  ctx.save();
  ctx.fillStyle = 'rgba(10, 15, 29, 0.88)';
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2;
  roundRect(ctx, pad, pad, badgeW, badgeH, 8);
  ctx.fill();
  ctx.stroke();

  // Red LIVE pulse dot
  const pulse = (Math.sin(time / 250) + 1) / 2;
  ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + pulse * 0.6})`;
  ctx.beginPath();
  ctx.arc(pad + badgeH * 0.5, pad + badgeH * 0.5, badgeH * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Inner dot
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(pad + badgeH * 0.5, pad + badgeH * 0.5, badgeH * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Branding text
  ctx.fillStyle = '#F59E0B';
  ctx.font = `900 ${Math.round(badgeH * 0.42)}px 'Inter', sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('AZAD', pad + badgeH * 0.85, pad + badgeH * 0.5);

  ctx.fillStyle = '#EF4444';
  const azadWidth = ctx.measureText('AZAD').width;
  ctx.fillText('LIVE', pad + badgeH * 0.85 + azadWidth + 6, pad + badgeH * 0.5);

  ctx.fillStyle = '#94A3B8';
  ctx.font = `600 ${Math.round(badgeH * 0.32)}px 'Inter', sans-serif`;
  const liveWidth = ctx.measureText('LIVE').width;
  ctx.fillText('• DIRECT', pad + badgeH * 0.85 + azadWidth + liveWidth + 12, pad + badgeH * 0.5);

  // Top Right: Tournament / Match Title and Custom Tournament Logo (e.g., KPL 5)
  if (match) {
    const tournamentLogoUrl = options.customLogos?.tournamentLogo || match.customLogos?.tournamentLogo;
    const tournamentImg = getCachedImage(tournamentLogoUrl);
    const sponsorLogoUrl = options.customLogos?.sponsorLogo || match.customLogos?.sponsorLogo;
    const sponsorImg = getCachedImage(sponsorLogoUrl);

    const titleText = (match.tournamentName || match.name || 'CRICKET MATCH').toUpperCase();
    const rightPad = width - pad;
    ctx.font = `bold ${Math.round(badgeH * 0.36)}px 'Inter', sans-serif`;
    const titleW = ctx.measureText(titleText).width + (tournamentImg ? badgeH + 40 : 30);

    ctx.fillStyle = 'rgba(10, 15, 29, 0.88)';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;
    roundRect(ctx, rightPad - titleW, pad, titleW, badgeH, 8);
    ctx.fill();
    ctx.stroke();

    if (tournamentImg) {
      const logoSize = Math.round(badgeH * 0.75);
      const logoX = rightPad - titleW + 8;
      const logoY = pad + (badgeH - logoSize) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(tournamentImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();

      ctx.fillStyle = '#F1F5F9';
      ctx.textAlign = 'right';
      ctx.fillText(titleText, rightPad - 15, pad + badgeH * 0.5);
    } else {
      ctx.fillStyle = '#F1F5F9';
      ctx.textAlign = 'right';
      ctx.fillText(titleText, rightPad - 15, pad + badgeH * 0.5);
    }

    // Top Center: Sponsor Branding (if configured from gallery)
    if (sponsorImg || match.customLogos?.sponsorTagline || options.customLogos?.sponsorTagline) {
      const sponsorTag = options.customLogos?.sponsorTagline || match.customLogos?.sponsorTagline || 'POWERED BY';
      const spBadgeW = Math.round(width * 0.26);
      const spBadgeX = (width - spBadgeW) / 2;
      ctx.fillStyle = 'rgba(10, 15, 29, 0.9)';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      roundRect(ctx, spBadgeX, pad, spBadgeW, badgeH, 8);
      ctx.fill();
      ctx.stroke();

      if (sponsorImg) {
        const sSize = Math.round(badgeH * 0.7);
        const sY = pad + (badgeH - sSize) / 2;
        ctx.drawImage(sponsorImg, spBadgeX + 10, sY, sSize * 1.5, sSize);
        ctx.fillStyle = '#94A3B8';
        ctx.font = `bold ${Math.round(badgeH * 0.28)}px 'Inter', sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(sponsorTag.toUpperCase(), spBadgeX + 16 + sSize * 1.5, pad + badgeH * 0.5);
      } else {
        ctx.fillStyle = '#F59E0B';
        ctx.font = `bold ${Math.round(badgeH * 0.3)}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(sponsorTag.toUpperCase(), width / 2, pad + badgeH * 0.5);
      }
    }
  }
  ctx.restore();
}

/**
 * Bottom Broadcast Scoreboard Lower-Third
 */
function drawScoreboardLowerThird(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  match: Match,
  options: CompositorOptions
) {
  const currentIdx = match.currentInningsIndex;
  const currentInn = match.innings[currentIdx];
  if (!currentInn) return;

  const battingTeam = currentIdx === 0 ? match.team1 : match.team2;
  const bowlingTeam = currentIdx === 0 ? match.team2 : match.team1;

  const striker = currentInn.batters.find((b) => b.playerId === currentInn.currentStrikerId);
  const nonStriker = currentInn.batters.find((b) => b.playerId === currentInn.currentNonStrikerId);
  const bowler = currentInn.bowlers.find((b) => b.playerId === currentInn.currentBowlerId);

  const crr = calculateRunRate(currentInn.totalRuns, currentInn.legalDeliveries);
  const runsNeeded = match.target ? Math.max(0, match.target - currentInn.totalRuns) : null;
  const ballsRemaining = match.target ? Math.max(0, match.overs * 6 - currentInn.legalDeliveries) : null;
  const rrr = runsNeeded !== null && ballsRemaining !== null ? calculateRequiredRunRate(runsNeeded, ballsRemaining) : null;

  const pos = options.customLogos?.scoreboardPosition || match.customLogos?.scoreboardPosition || 'bottom';
  const barH = Math.round(height * 0.165);
  const barY = pos === 'top'
    ? Math.round(height * 0.08)
    : height - barH - Math.round(height * 0.02);
  const barW = Math.round(width * 0.96);
  const barX = Math.round((width - barW) / 2);

  ctx.save();

  // Glassmorphism Main Board Background
  ctx.fillStyle = 'rgba(10, 15, 29, 0.94)';
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2.5;
  roundRect(ctx, barX, barY, barW, barH, 12);
  ctx.fill();
  ctx.stroke();

  // Red accent top stripe
  ctx.fillStyle = '#EF4444';
  roundRect(ctx, barX + 2, barY + 2, barW - 4, 3, 2);
  ctx.fill();

  // --- SECTION 1: BATTING TEAM & BIG SCORE ---
  const sec1W = Math.round(barW * 0.32);
  // Team Color Stripe
  ctx.fillStyle = battingTeam.color || '#F59E0B';
  roundRect(ctx, barX + 12, barY + 12, 6, barH - 24, 3);
  ctx.fill();

  // Custom Team Logo (from gallery or team data)
  const teamLogoUrl = currentIdx === 0
    ? (options.customLogos?.team1Logo || match.customLogos?.team1Logo || match.team1.logoUrl)
    : (options.customLogos?.team2Logo || match.customLogos?.team2Logo || match.team2.logoUrl);
  const teamLogoImg = getCachedImage(teamLogoUrl);
  const logoScale = Math.max(0.7, Math.min(1.4, options.customLogos?.logoScale || match.customLogos?.logoScale || 1.0));

  let textStartX = barX + 26;
  if (teamLogoImg) {
    const lRadius = Math.round(barH * 0.28 * logoScale);
    const lX = barX + 24;
    const lY = barY + Math.max(6, Math.round((barH - lRadius * 2) / 2));
    ctx.save();
    ctx.beginPath();
    ctx.arc(lX + lRadius, lY + lRadius, lRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.clip();
    ctx.drawImage(teamLogoImg, lX, lY, lRadius * 2, lRadius * 2);
    ctx.restore();
    textStartX = lX + lRadius * 2 + 10;
  }

  // Team Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${Math.round(barH * 0.2)}px 'Inter', sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(battingTeam.shortName || battingTeam.name.substring(0, 10), textStartX, barY + 14);

  // Big Runs / Wickets
  ctx.fillStyle = '#F59E0B';
  ctx.font = `900 ${Math.round(barH * 0.34)}px 'Inter', sans-serif`;
  const scoreStr = `${currentInn.totalRuns}/${currentInn.wickets}`;
  ctx.fillText(scoreStr, textStartX, barY + barH * 0.36);

  // Overs
  const scoreMeasure = ctx.measureText(scoreStr).width;
  ctx.fillStyle = '#CBD5E1';
  ctx.font = `700 ${Math.round(barH * 0.2)}px 'Inter', sans-serif`;
  ctx.fillText(`(${currentInn.oversFormatted} ov)`, textStartX + 8 + scoreMeasure, barY + barH * 0.44);

  // CRR and Target note
  ctx.fillStyle = '#94A3B8';
  ctx.font = `600 ${Math.round(barH * 0.15)}px 'Inter', sans-serif`;
  let targetStr = `CRR: ${crr}`;
  if (match.target && currentIdx === 1) {
    targetStr = `TGT: ${match.target} • NEED ${runsNeeded} IN ${ballsRemaining}B (RRR: ${rrr})`;
  }
  ctx.fillText(targetStr, barX + 26, barY + barH * 0.76);

  // Vertical Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(barX + sec1W, barY + 10);
  ctx.lineTo(barX + sec1W, barY + barH - 10);
  ctx.stroke();

  // --- SECTION 2: BATSMEN & BOWLER ---
  const sec2X = barX + sec1W + 15;
  const sec2W = Math.round(barW * 0.42);

  // Striker
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.round(barH * 0.18)}px 'Inter', sans-serif`;
  const strikerName = striker ? `${striker.name.substring(0, 14)}*` : 'Striker*';
  ctx.fillText(strikerName, sec2X, barY + 14);

  ctx.fillStyle = '#FBBF24';
  const strikerScore = striker ? `${striker.runs} (${striker.balls})` : '0 (0)';
  ctx.textAlign = 'right';
  ctx.fillText(strikerScore, sec2X + sec2W - 10, barY + 14);

  // Non-Striker
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8';
  ctx.font = `600 ${Math.round(barH * 0.16)}px 'Inter', sans-serif`;
  const nonStrikerName = nonStriker ? nonStriker.name.substring(0, 14) : 'Non-Striker';
  ctx.fillText(nonStrikerName, sec2X, barY + barH * 0.36);

  const nonStrikerScore = nonStriker ? `${nonStriker.runs} (${nonStriker.balls})` : '0 (0)';
  ctx.textAlign = 'right';
  ctx.fillText(nonStrikerScore, sec2X + sec2W - 10, barY + barH * 0.36);

  // Bowler
  ctx.textAlign = 'left';
  ctx.fillStyle = '#38BDF8';
  ctx.font = `bold ${Math.round(barH * 0.18)}px 'Inter', sans-serif`;
  const bowlerName = bowler ? `BOWLER: ${bowler.name.substring(0, 12)}` : 'BOWLER';
  ctx.fillText(bowlerName, sec2X, barY + barH * 0.68);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#F8FAFC';
  const bowlerFig = bowler ? `${bowler.wickets}/${bowler.runsConceded} (${bowler.overs} ov)` : '0/0';
  ctx.fillText(bowlerFig, sec2X + sec2W - 10, barY + barH * 0.68);

  // Vertical Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.moveTo(sec2X + sec2W + 5, barY + 10);
  ctx.lineTo(sec2X + sec2W + 5, barY + barH - 10);
  ctx.stroke();

  // --- SECTION 3: RECENT BALLS TICKER ---
  const sec3X = sec2X + sec2W + 15;
  const sec3W = barW - (sec3X - barX) - 10;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8';
  ctx.font = `bold ${Math.round(barH * 0.15)}px 'Inter', sans-serif`;
  ctx.fillText('THIS OVER:', sec3X, barY + 14);

  // Draw ball pills
  const recentBalls = currentInn.deliveries.slice(-6);
  const pillSize = Math.round(barH * 0.28);
  const pillGap = 6;
  const pillsStartY = barY + barH * 0.42;

  recentBalls.forEach((ball, i) => {
    const pX = sec3X + i * (pillSize + pillGap);
    if (pX + pillSize > barX + barW - 10) return;

    let fill = '#1E293B';
    let border = '#334155';
    let text = String(ball.runsBat);
    let textColor = '#F1F5F9';

    if (ball.isWicket) {
      fill = '#EF4444';
      border = '#B91C1C';
      text = 'W';
      textColor = '#FFFFFF';
    } else if (ball.runsBat === 6 || ball.isBoundarySix) {
      fill = '#F59E0B';
      border = '#D97706';
      text = '6';
      textColor = '#000000';
    } else if (ball.runsBat === 4 || ball.isBoundaryFour) {
      fill = '#2563EB';
      border = '#1D4ED8';
      text = '4';
      textColor = '#FFFFFF';
    } else if (ball.extraType === 'wide') {
      fill = '#D97706';
      border = '#B45309';
      text = ball.runsExtra > 1 ? `${ball.runsExtra}Wd` : 'Wd';
      textColor = '#FFFFFF';
    } else if (ball.extraType === 'noBall') {
      fill = '#EA580C';
      border = '#C2410C';
      text = ball.runsBat > 0 ? `${ball.runsBat}Nb` : 'Nb';
      textColor = '#FFFFFF';
    } else if (ball.runsBat === 0) {
      fill = '#0F172A';
      border = '#1E293B';
      text = '•';
      textColor = '#64748B';
    }

    ctx.fillStyle = fill;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pX + pillSize / 2, pillsStartY + pillSize / 2, pillSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.round(pillSize * 0.52)}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, pX + pillSize / 2, pillsStartY + pillSize / 2);
  });

  ctx.restore();
}

/**
 * Animated Event Splash (4, 6, Wicket Popups directly on video)
 */
function drawEventAnimationSplash(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  event: {
    type: 'boundary_four' | 'boundary_six' | 'wicket';
    text: string;
    subText: string;
  },
  elapsed: number
) {
  // Fade in first 400ms, hold, fade out last 500ms
  let opacity = 1;
  if (elapsed < 400) {
    opacity = elapsed / 400;
  } else if (elapsed > 4000) {
    opacity = Math.max(0, (4500 - elapsed) / 500);
  }

  // Scale bounce
  const progress = Math.min(1, elapsed / 300);
  const scale = 0.8 + 0.2 * Math.sin((progress * Math.PI) / 2);

  const bannerW = Math.round(width * 0.72);
  const bannerH = Math.round(height * 0.22);
  const bannerX = (width - bannerW) / 2;
  const bannerY = height * 0.32;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(width / 2, bannerY + bannerH / 2);
  ctx.scale(scale, scale);
  ctx.translate(-width / 2, -(bannerY + bannerH / 2));

  let primaryColor = '#F59E0B';
  let secondaryColor = '#EF4444';
  let glowColor = 'rgba(245, 158, 11, 0.6)';

  if (event.type === 'wicket') {
    primaryColor = '#EF4444';
    secondaryColor = '#7F1D1D';
    glowColor = 'rgba(239, 68, 68, 0.7)';
  } else if (event.type === 'boundary_four') {
    primaryColor = '#3B82F6';
    secondaryColor = '#1D4ED8';
    glowColor = 'rgba(59, 130, 246, 0.6)';
  }

  // Outer glow shadow
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 40;

  // Banner background gradient
  const grad = ctx.createLinearGradient(bannerX, bannerY, bannerX + bannerW, bannerY + bannerH);
  grad.addColorStop(0, '#090D16');
  grad.addColorStop(0.5, '#1E1B4B');
  grad.addColorStop(1, '#090D16');
  ctx.fillStyle = grad;
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 4;
  roundRect(ctx, bannerX, bannerY, bannerW, bannerH, 16);
  ctx.fill();
  ctx.stroke();

  // Reset shadow for text
  ctx.shadowBlur = 0;

  // Header event line
  ctx.fillStyle = primaryColor;
  ctx.font = `900 ${Math.round(bannerH * 0.38)}px 'Inter', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(event.text, width / 2, bannerY + bannerH * 0.38);

  // Subtitle
  ctx.fillStyle = '#F8FAFC';
  ctx.font = `700 ${Math.round(bannerH * 0.18)}px 'Inter', sans-serif`;
  ctx.fillText(event.subText, width / 2, bannerY + bannerH * 0.75);

  ctx.restore();
}

/**
 * Canvas utility: rounded rectangle
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
