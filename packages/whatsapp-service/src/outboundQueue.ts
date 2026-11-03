import { EventEmitter } from 'node:events';

export interface OutboundMessageJob {
  id: string;
  orgId: string;
  remoteJid: string;
  text: string;
  retries: number;
  maxRetries: number;
  createdAt: number;
}

export class OutboundQueue extends EventEmitter {
  private queue: OutboundMessageJob[] = [];
  private isProcessing = false;
  private consecutiveErrors = 0;
  private readonly maxConsecutiveErrors = 3;
  private isPaused = false;
  private pauseUntil = 0;

  constructor() {
    super();
  }

  public enqueue(orgId: string, remoteJid: string, text: string, maxRetries = 2): string {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.queue.push({
      id,
      orgId,
      remoteJid,
      text,
      retries: 0,
      maxRetries,
      createdAt: Date.now()
    });

    this.processNext();
    return id;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public isCircuitBreakerTripped(): boolean {
    if (this.isPaused && Date.now() < this.pauseUntil) {
      return true;
    }
    if (this.isPaused && Date.now() >= this.pauseUntil) {
      this.isPaused = false;
      this.consecutiveErrors = 0;
    }
    return false;
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    if (this.isCircuitBreakerTripped()) {
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift();
    if (!job) {
      this.isProcessing = false;
      return;
    }

    try {
      // Conservative human-like typing jitter: 1200ms to 2800ms
      const jitterMs = Math.floor(Math.random() * 1600) + 1200;
      await new Promise(resolve => setTimeout(resolve, jitterMs));

      this.emit('dispatch', job);
      this.consecutiveErrors = 0;
    } catch (err) {
      this.consecutiveErrors += 1;
      if (job.retries < job.maxRetries) {
        job.retries += 1;
        this.queue.push(job);
      } else {
        this.emit('failed', { job, error: err });
      }

      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        this.isPaused = true;
        this.pauseUntil = Date.now() + 60000; // Pause for 1 minute
        this.emit('circuit_tripped', { consecutiveErrors: this.consecutiveErrors, pausedForMs: 60000 });
      }
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        setTimeout(() => this.processNext(), 200);
      }
    }
  }
}
