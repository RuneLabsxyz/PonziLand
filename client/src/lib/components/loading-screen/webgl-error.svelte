<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Card } from '../ui/card';
  import CardContent from '../ui/card/card-content.svelte';

  interface Props {
    isVisible: boolean;
    errorMessage: string | null;
  }

  let { isVisible, errorMessage }: Props = $props();
</script>

{#if isVisible && errorMessage}
  <div class="relative w-screen h-screen">
    <div class="h-screen w-screen bg-black flex items-center justify-center">
      <Card class="max-w-md mx-auto text-center bg-ponzi">
        <CardContent>
          <div class="mb-6">
            <svg
              class="w-16 h-16 text-red-400 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <h2 class="text-2xl font-bold text-white mb-2">
              WebGL Not Supported
            </h2>
          </div>
          <p class="text-gray-300 mb-6">{errorMessage}</p>
          <div class="space-y-4">
            <button
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
              onclick={() => window.location.reload()}
            >
              Try Again
            </button>
            <div class="text-sm text-gray-400">
              <p class="mb-2">Possible solutions:</p>
              <ul class="text-left list-disc list-inside space-y-1">
                <li>Update your browser to the latest version</li>
                <li>Enable hardware acceleration in browser settings</li>
                <li>Try a different browser (Chrome, Firefox, Edge)</li>
                <li>Update your graphics drivers</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
{/if}
