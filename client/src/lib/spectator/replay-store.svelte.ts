import type { SnapshotResponse } from './spectator.service';
import type { ReplayEvent } from './replay-engine';
import {
  buildTimeline,
  getEventsBetween,
  getTimeAtProgress,
  getProgressFromTime,
  SPEED_OPTIONS,
} from './replay-engine';
import type { LeaderboardResponse } from './spectator.service';
import { landStore } from '$lib/stores/store.svelte';
import { nukeStore } from '$lib/stores/nuke.store.svelte';

class ReplayStore {
  // Timeline data
  private _events = $state<ReplayEvent[]>([]);
  private _snapshot = $state<SnapshotResponse | null>(null);

  // Playback state
  private _isPlaying = $state(false);
  private _speedIndex = $state(3); // Default to 8x speed
  private _currentTime = $state<Date | null>(null);

  // Time range
  private _startTime = $state<Date | null>(null);
  private _endTime = $state<Date | null>(null);

  // Loading state
  private _isLoading = $state(false);
  private _error = $state<string | null>(null);

  // Animation frame reference
  private _animationFrame: number | null = null;
  private _lastFrameTime: number = 0;

  // Getters
  get events() {
    return this._events;
  }
  get snapshot() {
    return this._snapshot;
  }
  get isPlaying() {
    return this._isPlaying;
  }
  get speed() {
    return SPEED_OPTIONS[this._speedIndex].value;
  }
  get speedLabel() {
    return SPEED_OPTIONS[this._speedIndex].label;
  }
  get speedIndex() {
    return this._speedIndex;
  }
  get currentTime() {
    return this._currentTime;
  }
  get startTime() {
    return this._startTime;
  }
  get endTime() {
    return this._endTime;
  }
  get isLoading() {
    return this._isLoading;
  }
  get error() {
    return this._error;
  }

  // Derived values
  get progress(): number {
    if (!this._startTime || !this._endTime || !this._currentTime) return 0;
    return getProgressFromTime(
      this._startTime,
      this._endTime,
      this._currentTime,
    );
  }

  get formattedCurrentTime(): string {
    if (!this._currentTime) return '--:--:--';
    return this._currentTime.toLocaleString();
  }

  get totalDuration(): number {
    if (!this._startTime || !this._endTime) return 0;
    return this._endTime.getTime() - this._startTime.getTime();
  }

  /**
   * Initialize replay with snapshot and timeline data
   */
  initialize(
    snapshot: SnapshotResponse,
    timeline: LeaderboardResponse,
    startTime: Date,
    endTime: Date,
  ): void {
    this._snapshot = snapshot;
    this._events = buildTimeline(timeline);
    this._startTime = startTime;
    this._endTime = endTime;
    this._currentTime = startTime;
    this._isPlaying = false;
    this._error = null;

    // Load the initial snapshot into the land store
    this.loadSnapshotIntoMap();
  }

  /**
   * Load snapshot data into the land store
   */
  private loadSnapshotIntoMap(): void {
    if (!this._snapshot) return;

    // Clear existing lands and load snapshot
    landStore.clearAllLands();

    for (const land of this._snapshot.lands) {
      landStore.loadSpectatorLand(land);
    }
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this._isLoading = loading;
  }

  /**
   * Set error state
   */
  setError(error: string | null): void {
    this._error = error;
  }

  /**
   * Toggle play/pause
   */
  togglePlay(): void {
    if (this._isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Start playback
   */
  play(): void {
    if (!this._startTime || !this._endTime || !this._currentTime) return;

    // If we're at the end, restart from beginning
    if (this._currentTime.getTime() >= this._endTime.getTime()) {
      this._currentTime = this._startTime;
      this.loadSnapshotIntoMap();
    }

    this._isPlaying = true;
    this._lastFrameTime = performance.now();
    this.tick();
  }

  /**
   * Pause playback
   */
  pause(): void {
    this._isPlaying = false;
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  /**
   * Animation tick - advances time based on speed
   */
  private tick(): void {
    if (!this._isPlaying) return;

    const now = performance.now();
    const deltaMs = now - this._lastFrameTime;
    this._lastFrameTime = now;

    // Advance current time based on speed multiplier
    // deltaMs is real time, multiply by speed to get simulated time
    const simulatedDeltaMs = deltaMs * this.speed;
    const previousTime = this._currentTime!;
    const newTime = new Date(previousTime.getTime() + simulatedDeltaMs);

    // Clamp to end time
    if (newTime.getTime() >= this._endTime!.getTime()) {
      this._currentTime = this._endTime;
      this._isPlaying = false;

      // Process remaining events
      this.processEventsBetween(previousTime, this._currentTime!);
      return;
    }

    this._currentTime = newTime;

    // Process events that occurred during this tick
    this.processEventsBetween(previousTime, newTime);

    // Schedule next tick
    this._animationFrame = requestAnimationFrame(() => this.tick());
  }

  /**
   * Process events between two times and update the map
   */
  private processEventsBetween(startTime: Date, endTime: Date): void {
    const events = getEventsBetween(this._events, startTime, endTime);

    for (const event of events) {
      this.applyEvent(event);
    }
  }

  /**
   * Apply a single replay event to the map
   */
  private applyEvent(event: ReplayEvent): void {
    if (event.type === 'buy') {
      // Create/update land with new owner
      landStore.applySpectatorBuy(event);
    } else if (event.type === 'nuke') {
      // Trigger nuke animation and clear land
      nukeStore.animationManager.triggerAnimation(event.location.toString());
      landStore.applySpectatorNuke(event);
    } else if (event.type === 'sold') {
      // Land was sold, will be replaced by next buy event
      // No visual change needed, the next buy will update it
    }
  }

  /**
   * Seek to a specific progress (0-1)
   */
  seek(progress: number): void {
    if (!this._startTime || !this._endTime) return;

    const wasPlaying = this._isPlaying;
    this.pause();

    // Calculate target time from progress
    const targetTime = getTimeAtProgress(
      this._startTime,
      this._endTime,
      progress,
    );
    this._currentTime = targetTime;

    // Recompute map state from snapshot
    this.recomputeState(targetTime);

    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Recompute map state at a specific time
   * This is needed when scrubbing the timeline
   */
  private recomputeState(targetTime: Date): void {
    if (!this._snapshot) return;

    // Start from scratch with snapshot
    this.loadSnapshotIntoMap();

    // Apply all events up to target time
    for (const event of this._events) {
      if (event.time.getTime() > targetTime.getTime()) break;
      this.applyEvent(event);
    }
  }

  /**
   * Change playback speed
   */
  setSpeed(index: number): void {
    if (index >= 0 && index < SPEED_OPTIONS.length) {
      this._speedIndex = index;
    }
  }

  /**
   * Increase speed
   */
  speedUp(): void {
    if (this._speedIndex < SPEED_OPTIONS.length - 1) {
      this._speedIndex++;
    }
  }

  /**
   * Decrease speed
   */
  slowDown(): void {
    if (this._speedIndex > 0) {
      this._speedIndex--;
    }
  }

  /**
   * Reset to beginning
   */
  reset(): void {
    this.pause();
    if (this._startTime) {
      this._currentTime = this._startTime;
      this.loadSnapshotIntoMap();
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.pause();
    this._events = [];
    this._snapshot = null;
    this._startTime = null;
    this._endTime = null;
    this._currentTime = null;
    this._error = null;
  }
}

export const replayStore = new ReplayStore();
