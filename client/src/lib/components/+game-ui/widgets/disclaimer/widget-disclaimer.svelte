<script>
  import { Button } from '$lib/components/ui/button';
  import { widgetsStore } from '$lib/stores/widgets.store';

  let dontShowAgain = $state(false);

  function handleAccept() {
    if (dontShowAgain) {
      widgetsStore.closeWidget('disclaimer');
    } else {
      widgetsStore.removeWidget('disclaimer');
    }
  }
</script>

<div class="w-full h-full flex items-center justify-center flex-col">
  <p class="text-ponzi-number my-3">⚠️ Smart contracts are NOT AUDITED ⚠️</p>
  <p class="">By using PonziLand, you acknowledge that:</p>
  <ul class="list-inside list-disc pl-6">
    <li>Smart contracts have not been audited</li>
    <li>There may be bugs or vulnerabilities</li>
    <li>You could lose all your funds</li>
    <li>You cannot stake more than 250$ per land</li>
    <li>You play at your own risk</li>
    <li>You're definitely gonna get rugged</li>
    <li>Markets are the apex predator</li>
    <li>You're just a human</li>
  </ul>

  <div class="flex items-center gap-2 mt-4 mb-2">
    <input
      type="checkbox"
      id="dontShowAgain"
      bind:checked={dontShowAgain}
      class="rounded"
    />
    <label for="dontShowAgain" class="text-sm cursor-pointer">
      Don't show this again
    </label>
  </div>

  <Button onclick={handleAccept} variant="red" class="mt-2">
    Enough with this, let me ape!
  </Button>

  <div class="opacity-50">Audit is coming soon™</div>
</div>
