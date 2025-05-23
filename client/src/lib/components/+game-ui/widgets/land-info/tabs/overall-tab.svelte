<script lang="ts">
  import { Button } from '$lib/components/ui/button';

  export let isActive = false;
</script>

{#if isActive}
  <!-- Overall tab content will go here -->
  <div class="w-full flex flex-col gap-2">
    <div class="flex w-full justify-center">Total earnings</div>
    <div class="flex w-full justify-between">
      <div>earning/h</div>
      <div>burn/h</div>
    </div>
    <div class="flex flex-col gap-2 rounded bg-[#1E1E2D] p-4">
      <div class="w-full flex gap-2 items-center">
        <div class="flex-1 h-[1px] bg-white"></div>
        <div class="">Main informations</div>
        <div class="flex-1 h-[1px] bg-white"></div>
      </div>
      <div class="flex justify-between items-center">
        <div>title</div>
        <div>info</div>
      </div>
      <div class="flex justify-between items-center">
        <div>title</div>
        <div>info</div>
      </div>
    </div>
    <div class="flex">
      <div class="w-full">Increase Stake component</div>
      <div class="w-full">Increase Price component</div>
      <!-- <Button>Buy land (if not owner)</Button>\ -->
    </div>
  </div>
{/if}
