// Keeps the pupil's answers safe. Every change is kept on the device at once and sent to the server one question at a
// time; if the network fails it keeps trying, and a page reload sends again whatever the server does not have yet.
import { pupilPost, ApiError } from "./client";

export type SaveState = "saved" | "saving" | "offline";

export interface AnswerSyncOptions {
  token: string;
  storageKey: string;
  onState: (state: SaveState, pending: number) => void;
  onEnded: (code: string) => void;
}

const FATAL = new Set(["EXAM_ENDED", "ALREADY_SUBMITTED", "AUTH_REQUIRED", "EXAM_NOT_STARTED"]);

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export class AnswerSync {
  private pending = new Map<string, { value: unknown; seq: number }>();
  private answers: Record<string, unknown> = {};
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private failures = 0;
  private stopped = false;
  private clockOffset = 0;

  constructor(private options: AnswerSyncOptions) {
    const saved = store()?.getItem(options.storageKey);
    if (saved) {
      try {
        this.answers = (JSON.parse(saved) as { answers?: Record<string, unknown> }).answers || {};
      } catch {
        this.answers = {};
      }
    }
  }

  /** Answers kept on this device (the latest the pupil gave). */
  local(): Record<string, unknown> {
    return { ...this.answers };
  }

  private persist() {
    store()?.setItem(this.options.storageKey, JSON.stringify({ answers: this.answers, at: Date.now() }));
  }

  /** After a reload: whatever this device has and the server lacks is sent again. */
  reconcile(server: Record<string, unknown>) {
    for (const [qid, value] of Object.entries(this.answers)) {
      if (JSON.stringify(server[qid] ?? null) !== JSON.stringify(value ?? null)) this.queue(qid, value);
    }
    for (const [qid, value] of Object.entries(server)) if (!(qid in this.answers)) this.answers[qid] = value;
    this.persist();
  }

  set(qid: string, value: unknown) {
    this.answers[qid] = value ?? null;
    this.persist();
    this.queue(qid, value ?? null);
  }

  private queue(qid: string, value: unknown) {
    this.pending.set(qid, { value, seq: Math.floor((Date.now() + this.clockOffset) / 1000) });
    this.options.onState("saving", this.pending.size);
    void this.flush();
  }

  private async flush() {
    if (this.running || this.stopped) return;
    this.running = true;
    try {
      while (this.pending.size > 0 && !this.stopped) {
        const [qid, item] = this.pending.entries().next().value as [string, { value: unknown; seq: number }];
        try {
          const result = await pupilPost<{ stale?: boolean; savedAt?: number }>({ action: "answer", qid, value: item.value, seq: item.seq }, this.options.token);
          if (result.stale && this.pending.get(qid) === item) {
            // ponytail: seconds-based legacy sequence; retry next server second, upgrade to revisions for cross-tab editing.
            const serverTime = result.savedAt ?? Date.now();
            this.clockOffset = serverTime - Date.now();
            this.options.onState("saving", this.pending.size);
            this.timer = setTimeout(() => {
              this.timer = null;
              this.running = false;
              const latest = this.pending.get(qid);
              if (latest) latest.seq = Math.floor((Date.now() + this.clockOffset) / 1000);
              void this.flush();
            }, 1000);
            return;
          }
          if (this.pending.get(qid) === item) this.pending.delete(qid);
          this.failures = 0;
          this.options.onState(this.pending.size ? "saving" : "saved", this.pending.size);
        } catch (error) {
          const code = error instanceof ApiError ? error.code : "NETWORK";
          if (FATAL.has(code)) {
            this.pending.clear();
            this.options.onEnded(code);
            return;
          }
          if (code === "NOT_FOUND" || code === "INVALID_BODY" || code === "ANSWER_TOO_LARGE") {
            this.pending.delete(qid);
            continue;
          }
          this.failures++;
          this.options.onState("offline", this.pending.size);
          const wait = Math.min(15000, 1200 * 2 ** Math.min(this.failures, 4));
          this.timer = setTimeout(() => {
            this.timer = null;
            this.running = false;
            void this.flush();
          }, wait);
          return;
        }
      }
    } finally {
      if (!this.timer) this.running = false;
    }
  }

  /** Waits (a few seconds at most) for the answers still on their way. */
  async settle(maxMs = 6000): Promise<void> {
    const until = Date.now() + maxMs;
    while (this.pending.size > 0 && Date.now() < until) await new Promise((r) => setTimeout(r, 200));
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  clearStored() {
    store()?.removeItem(this.options.storageKey);
  }
}
