# PonziLand Dojo Vibe Jam Guide

Welcome to the PonziLand Dojo Vibe Jam! This guide will walk you through:

- Environment setup
- Project structure overview
- Existing widget examples
- Modification ideas you can try

---

## Table of Contents

1. [Getting Started](#getting-started)
   - [Cloning the Repository](#cloning-the-repository)
   - [Installing Dependencies](#installing-dependencies)
   - [Running the Front End Locally](#running-the-front-end-locally)
2. [Project Architecture](#project-architecture)
   - [Code Organization](#code-organization)
   - [Widget System Overview](#widget-system-overview)
3. [Creating a New Widget](#creating-a-new-widget)
   - [Step 1: Directory & File Structure](#step-1-directory--file-structure)
   - [Step 2: Svelte Component](#step-2-svelte-component)
   - [Step 3: Registering the Widget](#step-3-registering-the-widget)
   - [Step 4: Adding the Toggle Button](#step-4-adding-the-toggle-button)
   - [Step 5: Default State & Layout](#step-5-default-state--layout)
   - [Step 6: Verifying Your Widget](#step-6-verifying-your-widget)
4. [Working with Torii State](#working-with-torii-state)
   - [Selected Land Store](#selected-land-store)
   - [Map Store](#map-store)
5. [Example Mods](#example-mods)
6. [Modification Ideas](#modification-ideas)

---

## Getting Started

### Cloning the Repository

```bash
git clone git@github.com:RuneLabsxyz/PonziLand.git
cd PonziLand/client
````

### Installing Dependencies

```bash
bun install
```

### Running the Front End Locally

```bash
bun dev:mainnet
```

Open your browser at `https://localhost:3000` to start experimenting.

---

## Project Architecture

### Code Organization

* **`client/src/lib/components/+game-ui/widgets/`**: All widgets live here, each in its own folder named by widget key.
* **`client/src/lib/components/+game-ui/widget-provider.svelte`**: Central registry that renders widgets.
* **`client/src/lib/components/+game-ui/widget.config.ts`**: Configuration for available widgets (labels, icons, IDs).
* **`client/src/lib/components/+game-ui/widget.store.ts`**: Default state (position, size, open/minimized flags).

### Widget System Overview

Widgets let you extend the UI without touching core game logic. Each widget is:

1. A Svelte component (`widget-<YourKey>.svelte`).
2. Optionally accompanied by helper `.ts` files.
3. Registered in the provider and config files.

---

## Creating a New Widget

### Step 1: Directory & File Structure

Create a new directory:

```
client/src/lib/components/+game-ui/widgets/<your-widget-key>/
```

### Step 2: Svelte Component

Inside, add `widget-<YourWidgetKey>.svelte`:

```svelte
<script lang="ts">
  // Widget logic
</script>

<div class="widget-container">
  <!-- UI markup -->
</div>

<style>
  /* Scoped styles (Tailwind supported) */
</style>
```

Add helper files (`*.ts`) if needed.

### Step 3: Registering the Widget

Import and render your widget in `widget-provider.svelte`:

```svelte
<script lang="ts">
  import WidgetYour from './your-widget/WidgetYour.svelte';
  // ...other imports
</script>

{#each Object.entries($widgetsStore) as [id, widget]}
  {#if widget.isOpen}
    <Draggable {id} type={widget.type} initialPosition={widget.position}
               initialDimensions={widget.dimensions}
               bind:isMinimized={widget.isMinimized}
               disableResize={widget.disableResize}>

      {#if widget.type === 'your-widget'}
        <WidgetYour />
      {/if}

    </Draggable>
  {/if}
{/each}
```

### Step 4: Adding the Toggle Button

In `widget.config.ts`, add your widget:

```ts
export const availableWidgets: Widget[] = [
  // ...existing widgets
  {
    id: 'your-widget',
    type: 'your-widget',
    label: 'Your Widget',
    icon: '/ui/icons/Icon_Thin_Your.png',
  },
];
```

This creates a HUD button to open/close your widget.

### Step 5: Default State & Layout

In `widget.store.ts`, configure default state:

```ts
export const DEFAULT_WIDGETS_STATE: Record<string, WidgetState> = {
  'your-widget': {
    id: 'your-widget',
    type: 'your-widget',
    position: { x: 100, y: 100 },
    dimensions: { width: 400, height: 300 },
    isMinimized: false,
    isOpen: false,
  },
};
```

Adjust `position`, `dimensions`, `disableControls`, etc.

### Step 6: Verifying Your Widget

1. Start the front end locally: `bun dev:mainnet`
2. Click the new widget button in the HUD.
3. Confirm drag, resize, minimize and close behaviors.

---

## Working with Torii State

### Selected Land Store

```ts
import { selectedLandWithActions } from '$lib/stores/store.svelte';
```

Use in Svelte with Svelte runes:

```svelte
<script lang="ts">
  import account from '$lib/account.svelte';
  import { selectedLandWithActions } from '$lib/stores/store.svelte';

  const address = $derived(account.address);
  const landWithActions = $derived(selectedLandWithActions());

  const isOwner = $derived(
    landWithActions?.value?.owner === padAddress(address ?? '')
  );

  const land = $derived(landWithActions?.value);
</script>

<div>
  Pending taxes: {$land.getPendingTaxes()}
</div>
```

#### Call onchain actions on `landWithActions`:

| Method                  | Description         |
| ----------------------- | ------------------- |
| `increaseStake(amount)` | Increase land stake |
| `increasePrice(amount)` | Increase land price |
| `claim()`               | Claim rewards       |
| `levelUp()`             | Increase land level |

#### Fetch onchain data with:

| Method                     | Description                    |
| -------------------------- | ------------------------------ |
| `getPendingTaxes()`        | Fetch pending taxes            |
| `getNextClaim()`           | Get information on next claim  |
| `getNukable()`             | Time until land can be nuked   |
| `getCurrentAuctionPrice()` | Current auction price          |
| `getYieldInfo()`           | Yield information for the land |
| `getEstimatedNukeTime()`   | Estimated time to nuke         |
| `getNeighbors()`           | Neighboring land data          |
| `getLevelInfo()`           | Details on current land level  |


### Map Store

```ts
import { landStore } from '$lib/stores/store.svelte';
```

Subscribe to all lands:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  let lands = [];
  let unsubscribe;

  onMount(() => {
    const subscription = landStore.getAllLands().subscribe(data => {
      lands = data || [];
    });
    unsubscribe = subscription;
  });

  onDestroy(() => unsubscribe && unsubscribe());
</script>
```

---

## Example Mods

- [Djizus](https://x.com/djizus_) from the [WASD](https://x.com/WASD_0x) guild built a custom [widget](https://github.com/djizus/PonziLand/blob/main/client/src/lib/components/%2Bgame-ui/widgets/script-tools/widget-script-tools.svelte) intented to automate buys based on user selected requirements. 

---

## Modification Ideas

TODO

Feel free to mix, match, and experiment!
