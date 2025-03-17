<script lang="ts">
  import { goto } from '$app/navigation';
  import Invitation from '$lib/components/socialink/Invitation.svelte';
</script>

<Invitation onfinish={() => goto('/game')} />
