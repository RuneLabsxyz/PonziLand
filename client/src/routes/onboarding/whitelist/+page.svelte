<script lang="ts">
  import { goto } from '$app/navigation';
  import Invitation from '$lib/components/socialink/Invitation.svelte';
  import { ENABLE_TUTORIAL } from '$lib/flags';
</script>

<Invitation
  onfinish={() => (ENABLE_TUTORIAL ? goto('/tutorial') : goto('/game'))}
/>
