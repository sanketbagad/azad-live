/**
 * Instant-replay buffer: keeps the last few seconds of camera footage in memory as small
 * JPEG frames (≈30 KB each, ~15 MB for 35 s at 15 fps) so a phone can replay them at any
 * speed without re-encoding video.
 */

export interface ReplayFrame {
  /** performance.now() timestamp when the frame was captured */
  t: number;
  blob: Blob;
}

export class ReplayBuffer {
  private frames: ReplayFrame[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private pending = false;
  private lastCapture = 0;
  private paused = false;

  constructor(
    private readonly maxSeconds = 35,
    private readonly fps = 15,
    width = 640,
    height = 360
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
  }

  /** Call every render tick; captures at most `fps` frames per second. */
  capture(source: CanvasImageSource, srcWidth: number, srcHeight: number, now = performance.now()) {
    if (this.paused || this.pending || !this.ctx || srcWidth === 0 || srcHeight === 0) return;
    if (now - this.lastCapture < 1000 / this.fps) return;
    this.lastCapture = now;

    // Cover-fit into the buffer canvas
    const { width, height } = this.canvas;
    const srcRatio = srcWidth / srcHeight;
    const dstRatio = width / height;
    let sx = 0;
    let sy = 0;
    let sw = srcWidth;
    let sh = srcHeight;
    if (srcRatio > dstRatio) {
      sw = srcHeight * dstRatio;
      sx = (srcWidth - sw) / 2;
    } else {
      sh = srcWidth / dstRatio;
      sy = (srcHeight - sh) / 2;
    }
    this.ctx.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);

    this.pending = true;
    this.canvas.toBlob(
      (blob) => {
        this.pending = false;
        if (!blob) return;
        this.frames.push({ t: now, blob });
        const cutoff = now - this.maxSeconds * 1000;
        while (this.frames.length > 0 && this.frames[0].t < cutoff) this.frames.shift();
      },
      'image/jpeg',
      0.72
    );
  }

  /** Seconds of footage currently available. */
  get bufferedSeconds(): number {
    if (this.frames.length < 2) return 0;
    return (this.frames[this.frames.length - 1].t - this.frames[0].t) / 1000;
  }

  /** The most recent `seconds` of footage (oldest first). */
  snapshot(seconds: number): ReplayFrame[] {
    if (this.frames.length === 0) return [];
    const end = this.frames[this.frames.length - 1].t;
    return this.frames.filter((f) => f.t >= end - seconds * 1000);
  }

  /** Stop capturing (e.g. camera off); frames already buffered are kept. */
  setPaused(paused: boolean) {
    this.paused = paused;
  }

  clear() {
    this.frames = [];
  }
}
