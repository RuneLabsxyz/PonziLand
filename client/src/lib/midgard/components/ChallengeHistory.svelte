<script lang="ts">
  import type { Challenge } from '../api-client';

  interface Props {
    challenges: Challenge[];
    maxHeight?: string;
  }

  let { challenges, maxHeight = '200px' }: Props = $props();

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString();
  }
</script>

<div class="space-y-2">
  <h4 class="text-sm font-semibold text-gray-400">Challenge History</h4>

  {#if challenges.length > 0}
    <div class="overflow-y-auto" style="max-height: {maxHeight}">
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-gray-900">
          <tr class="text-gray-500">
            <th class="py-1 text-left">Time</th>
            <th class="py-1 text-right">Ticket</th>
            <th class="py-1 text-center">Player</th>
            <th class="py-1 text-center">Factory</th>
            <th class="py-1 text-right">Result</th>
          </tr>
        </thead>
        <tbody>
          {#each challenges as challenge}
            <tr class="border-t border-gray-800">
              <td class="py-1 text-gray-400">
                {challenge.completedAtTime
                  ? formatDate(challenge.completedAtTime)
                  : 'Pending'}
              </td>
              <td class="py-1 text-right font-ponzi-number text-yellow-400">
                {challenge.ticketCost.toFixed(2)}
              </td>
              <td class="py-1 text-center font-ponzi-number text-cyan-400">
                {challenge.playerScore ?? '-'}
              </td>
              <td class="py-1 text-center font-ponzi-number text-purple-400">
                {challenge.factoryScore ?? '-'}
              </td>
              <td class="py-1 text-right">
                {#if challenge.status === 'completed'}
                  <span
                    class={[
                      'font-ponzi-number',
                      {
                        'text-green-400': challenge.won,
                        'text-red-400': !challenge.won,
                      },
                    ]}
                  >
                    {challenge.won ? '+' : ''}{(
                      challenge.gardChange ?? 0
                    ).toFixed(2)}
                  </span>
                {:else}
                  <span class="text-gray-500">{challenge.status}</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="py-4 text-center text-xs text-gray-500">No challenges yet</div>
  {/if}
</div>
