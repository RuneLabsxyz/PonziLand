// TODO(Red): This might be worth refactoring.
// We have both the NukeAnimationManager which has functions to do some actions, with batching
// and we have the nukeStore, that is manipulated everywhere, with no real concern into consistency.
//
// Also, we have a good class that can be reactive, so it could be worth looking into making it own
// the rest of the nukestore.

// Optimized nuke animation management with batching
class NukeAnimationManager {
  private activeAnimations = new Map<
    string,
    { startTime: number; timeoutId?: number }
  >();
  private animationDuration = 3000;
  private batchQueue: Array<{
    location: string;
    delay: number;
    queueTime: number;
  }> = [];
  private batchTimer?: number;
  private batchThreshold = 50; // ms to wait before processing batch
  private maxBatchSize = 20; // max nukes per batch to prevent overwhelming
  private animationTimeoutGroups = new Map<number, Set<string>>(); // Group timeouts by end time
  private cleanupInterval?: number;

  constructor() {
    // Periodic cleanup of completed timeouts to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanupCompletedGroups();
    }, 5000) as unknown as number;
  }

  triggerAnimation(location: string, delay: number = 0): void {
    // Cancel existing animation for this location
    this.clearAnimation(location);

    // Add to batch queue instead of immediate processing
    this.batchQueue.push({
      location,
      delay,
      queueTime: performance.now(),
    });

    // Start batch timer if not running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.batchThreshold) as unknown as number;
    }

    // Force process if batch gets too large
    if (this.batchQueue.length >= this.maxBatchSize) {
      clearTimeout(this.batchTimer);
      this.processBatch();
    }
  }

  private processBatch(): void {
    if (this.batchQueue.length === 0) return;

    const currentTime = performance.now();
    const batch = this.batchQueue.splice(0, this.maxBatchSize);
    this.batchTimer = undefined;

    // Group animations by their delay time to batch timeout creation
    // Red: This shouldn't need to be reactive, because it's only used within this function
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const delayGroups = new Map<
      number,
      Array<{ location: string; delay: number }>
    >();

    for (const item of batch) {
      const effectiveDelay = Math.max(
        0,
        item.delay - (currentTime - item.queueTime),
      );
      const delayKey = Math.round(effectiveDelay / 100) * 100; // Round to nearest 100ms for grouping

      if (!delayGroups.has(delayKey)) {
        delayGroups.set(delayKey, []);
      }
      delayGroups
        .get(delayKey)!
        .push({ location: item.location, delay: effectiveDelay });
    }

    // Process each delay group with a single timeout
    for (const [groupDelay, items] of delayGroups) {
      if (groupDelay <= 0) {
        // Immediate trigger
        this.startAnimationsGroup(items.map((i) => i.location));
      } else {
        // Delayed trigger
        const timeoutId = setTimeout(() => {
          this.startAnimationsGroup(items.map((i) => i.location));
        }, groupDelay) as unknown as number;

        // Track this timeout for cleanup
        for (const item of items) {
          this.activeAnimations.set(item.location, { startTime: 0, timeoutId });
        }
      }
    }

    // Continue processing if more items queued
    if (this.batchQueue.length > 0) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.batchThreshold) as unknown as number;
    }
  }

  private startAnimationsGroup(locations: string[]): void {
    if (locations.length === 0) return;

    const startTime = performance.now();
    const endTime = Math.floor(startTime + this.animationDuration);

    // Create a single timeout for this group of animations
    const groupTimeoutId = setTimeout(() => {
      this.clearAnimationsGroup(locations);
    }, this.animationDuration) as unknown as number;

    // Track this group for efficient cleanup
    if (!this.animationTimeoutGroups.has(endTime)) {
      this.animationTimeoutGroups.set(endTime, new Set());
    }
    const group = this.animationTimeoutGroups.get(endTime)!;

    // Start all animations in this group
    for (const location of locations) {
      nukeStore.nuking[location] = true;
      this.activeAnimations.set(location, {
        startTime,
        timeoutId: groupTimeoutId,
      });
      group.add(location);
    }
  }

  private clearAnimationsGroup(locations: string[]): void {
    for (const location of locations) {
      this.activeAnimations.delete(location);
      nukeStore.nuking[location] = false;
    }
  }

  private cleanupCompletedGroups(): void {
    const currentTime = performance.now();
    for (const [endTime] of this.animationTimeoutGroups) {
      if (currentTime >= endTime) {
        this.animationTimeoutGroups.delete(endTime);
      }
    }
  }

  clearAnimation(location: string): void {
    const animation = this.activeAnimations.get(location);
    if (animation?.timeoutId) {
      // Note: We don't clear the timeout here as it might be shared with other animations
      // The timeout will clean up naturally when it fires
    }
    this.activeAnimations.delete(location);
    nukeStore.nuking[location] = false;

    // Remove from batch queue if present
    this.batchQueue = this.batchQueue.filter(
      (item) => item.location !== location,
    );
  }

  clearAllAnimations(): void {
    // Clear batch processing
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    this.batchQueue.length = 0;

    // Clear all active animations
    for (const [location] of this.activeAnimations) {
      nukeStore.nuking[location] = false;
    }
    this.activeAnimations.clear();
    this.animationTimeoutGroups.clear();
  }

  getActiveAnimationCount(): number {
    return this.activeAnimations.size;
  }

  getBatchQueueSize(): number {
    return this.batchQueue.length;
  }

  // Cleanup when manager is destroyed
  destroy(): void {
    this.clearAllAnimations();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const nukeStore = $state<{
  pending: { [location: string]: boolean };
  nuking: { [location: string]: boolean };
  animationManager: NukeAnimationManager;
}>({
  pending: {},
  nuking: {},
  animationManager: new NukeAnimationManager(),
});

export function setPending(location: string) {
  nukeStore.pending = { ...nukeStore.pending, [location]: true };
}

export function clearPending(location: string) {
  const newPending = { ...nukeStore.pending };
  delete newPending[location];
  nukeStore.pending = newPending;
}

export function markAsNuking(location: string) {
  clearPending(location);
  nukeStore.nuking = { ...nukeStore.nuking, [location]: true };
}

export function clearNuking(location: string) {
  const newNuking = { ...nukeStore.nuking };
  delete newNuking[location];
  nukeStore.nuking = newNuking;
}
