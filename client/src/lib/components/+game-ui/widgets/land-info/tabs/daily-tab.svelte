<script lang="ts">
  export let isActive = false;
</script>

{#if isActive}
  <div class="w-full h-full">
    <!-- Daily tab content will go here -->
    <p>Daily statistics and information</p>
  </div>
{/if} 