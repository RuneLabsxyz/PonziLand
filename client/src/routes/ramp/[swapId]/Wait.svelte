<script lang="ts">
  import { Progress } from '$lib/components/ui/progress';
  import type { PageData } from './$types';
  import { Temporal } from 'temporal-polyfill';
  import { formatDurationHMS } from '$lib/utils/date';

  const {
    swap,
    transferTime,
  }: {
    swap: PageData['swap'];
    transferTime?: string;
  } = $props();

  function parseDurationFromLayerSwap(duration: string) {
    let regex = /(?<H>\d{2}):(?<M>\d{2}):(?<S>\d{2}).(?<F>\d+)/g;

    console.log('duration', duration);

    let match = regex.exec(duration);

    if (!match) return null;
    let { H, M, S, F } = match.groups!;
    return Temporal.Duration.from({
      hours: parseInt(H),
      minutes: parseInt(M),
      seconds: parseInt(S),
    });
  }

  let duration = $derived(
    parseDurationFromLayerSwap(swap.averageCompletionTime.toString())!.add({
      minutes: 1,
    }),
  );
  let transferTimeInstant = $derived(
    Temporal.Instant.from(transferTime ?? new Date().toJSON()),
  );

  let expectedEnd = $derived(transferTimeInstant.add(duration));

  let now = $state(Temporal.Now.instant());

  $effect(() => {
    const cancel = setInterval(() => {
      now = Temporal.Now.instant();
    }, 1000);

    return () => {
      clearInterval(cancel);
    };
  });

  let until = $derived(now.until(expectedEnd));
  let max = $derived(duration.total('seconds'));

  function formatDuration(d: Temporal.Duration) {
    const totalSeconds = d.total('seconds');
    return formatDurationHMS(totalSeconds);
  }
</script>

<Progress {max} value={max - until.total('seconds')} />
<div class="flex justify-between">
  <span class=" opacity-75">
    Current: {formatDuration(now.since(transferTimeInstant))}
  </span>
  <span class=" opacity-75">
    Estimated: {formatDuration(duration)}
  </span>
</div>
