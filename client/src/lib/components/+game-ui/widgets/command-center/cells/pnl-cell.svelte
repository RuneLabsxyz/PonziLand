<script lang="ts">
  interface Props {
    position: {
      id: string;
      close_date: string | null;
    };
    showShareButton?: boolean;
  }

  let { position, showShareButton = true }: Props = $props();

  const isOpen = !position.close_date || position.close_date === null;
  const displayText = isOpen ? 'TBD' : '-';
</script>

<div class="text-right flex items-center justify-end gap-1">
  <span class="text-gray-500">{displayText}</span>
  {#if !isOpen && showShareButton}
    <div
      class="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 cursor-pointer"
      onclick={() => window.sharePosition?.(position.id)}
      title="Share position"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16,6 12,2 8,6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    </div>
  {/if}
</div>
