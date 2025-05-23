<script lang="ts">
  export let isActive = false;
</script>

{#if isActive}
  <div class="w-full h-full">
    <!-- Overall tab content will go here -->
    <p>Overall statistics and information</p>
  </div>
{/if} 