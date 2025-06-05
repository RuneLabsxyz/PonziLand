import { writable } from 'svelte/store';
import { settingsStore } from './settings.store.svelte';

export type SoundInstance<T> = {
  audio: InstanceType<typeof Audio>;
  key: T;
};

interface PlayOptions {
  volume?: number; // value between 0.0 and 1.0
  loop?: boolean;
  fade?: number; // milliseconds
  pitch?: number; // default is 1.0 for normal pitch
  preservesPitch?: boolean; // default is false
  trim?: {
    start?: number;
    stop?: number;
  };
}
export function createAudioStore<T>(sounds: Record<T, string>) {
  const { subscribe, set, update } = writable<SoundInstance<T>[]>([]);

  /**
   * A utility function to fade an audio element in or out.
   * @param audio - The HTML audio element to fade.
   * @param fadeIn - Whether to fade in (true) or out (false).
   * @param duration - The duration over which the fade should occur.
   */
  const fadeAudio = (
    audio: HTMLAudioElement,
    fadeIn: boolean,
    duration: number,
  ) => {
    const step = 0.05;
    const interval = duration * step;
    if (fadeIn) {
      audio.volume = 0;
      let volume = 0;
      const fadeInterval = setInterval(() => {
        volume += step;
        audio.volume = volume;
        if (volume >= 1) clearInterval(fadeInterval);
      }, interval);
    } else {
      let volume = 1;
      const fadeInterval = setInterval(() => {
        volume -= step;
        audio.volume = volume;
        if (volume <= 0) {
          audio.pause();
          clearInterval(fadeInterval);
        }
      }, interval);
    }
  };

  return {
    /**
     * Subscribe to the audio store to be notified of changes.
     */
    subscribe,
    /**
     * Preloads all the sounds specified during the store's creation.
     * This ensures sounds are loaded into memory for faster playbacks.
     */
    preload: () => {
      // Preload sounds based on provided dictionary
      Object.values(sounds).forEach((src) => {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.load();
      });
    },
    /**
     * Play a specific sound by its key with optional playback settings.
     * @param key - The key of the sound to play.
     * @param options - Playback settings such as volume, pitch, and trimming.
     */
    play: (key: T, options: PlayOptions = {}) => {
      const src = sounds[key];
      if (!src) {
        console.error(`Sound "${key}" not found.`);
        return;
      }

      const audio = new Audio(src);
      audio.loop = options.loop || false;

      if (options.volume !== undefined) {
        audio.volume = options.volume;
      } else {
        audio.volume = settingsStore.volume / 100; // Default volume if not specified
      }
      if (options.pitch) {
        audio.playbackRate = options.pitch; // Adjusting the pitch (and speed) of the sound
      }

      // Adjust the preservesPitch property based on the option provided
      if (typeof audio.preservesPitch !== 'undefined') {
        audio.preservesPitch = options.preservesPitch || false;
      } else if (typeof (audio as any).mozPreservesPitch !== 'undefined') {
        // For Firefox
        (audio as any).mozPreservesPitch = options.preservesPitch || false;
      }

      if (options.trim) {
        if (options.trim.start) {
          audio.currentTime = options.trim.start;
        }

        if (options.trim.stop !== undefined) {
          audio.addEventListener('timeupdate', function checkTime() {
            if (audio.currentTime >= options.trim!.stop!) {
              // We can safely use the non-null assertion here because we're inside the `if (options.trim)` check
              audio.pause();
              audio.removeEventListener('timeupdate', checkTime);
              if (!options.fade) {
                update((instances) =>
                  instances.filter((instance) => instance.audio !== audio),
                );
              } else {
                fadeAudio(audio, false, options.fade);
              }
            }
          });
        }
      }

      if (options.fade) {
        fadeAudio(audio, true, options.fade);
      }

      audio.onended = () => {
        update((instances) =>
          instances.filter((instance) => instance.audio !== audio),
        );
      };

      audio.play();

      update((instances) => [...instances, { audio, key }]);
    },
    /**
     * Stop a specific sound by its key with optional settings.
     * @param key - The key of the sound to stop.
     * @param options - Settings such as fade out duration.
     */
    stop: (key: T, options: PlayOptions = {}) => {
      update((instances) => {
        const toStop = instances.filter((instance) => instance.key === key);
        toStop.forEach((instance) => {
          if (options.fade) {
            fadeAudio(instance.audio, false, options.fade);
            setTimeout(() => instance.audio.pause(), options.fade);
          } else {
            instance.audio.pause();
          }
        });
        return instances.filter((instance) => !toStop.includes(instance));
      });
    },
    /**
     * Set the volume for all currently playing sounds.
     * @param volume - The volume level to set (0.0 to 1.0).
     */
    setVolume: (volume: number) => {
      update((instances) => {
        instances.forEach((instance) => (instance.audio.volume = volume));
        return instances;
      });
    },
  };
}
