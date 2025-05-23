<script lang="ts">
  export let isActive = false;
</script>

{#if isActive}
  <div class="w-full h-full">
    <!-- History tab content will go here -->
    <p>Historical data and information</p>
  </div>
{/if} 