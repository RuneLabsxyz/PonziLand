# Objective
Instead of relying on the base zustand store made available by the dojo.js sdk,
we will use a custom store optimized for the representation of our tiles (in a grid instead of linearly).
This also allows us to only refresh the land that has changed instead of the entire grid each time (as we are limited by the derived store system)
It also allows us to use runes instead of svelte4 stores, improving usability.

# Implementation

Instead of using $state everywhere (something I would have loved), it simply cannot work that way, as the updates would be everywhere.
the best solution would be to use land store. Each land coordinate is a store that you can access. Should allow you do to the following code:

```js
let landStore = getLand(x,y);
let land = $derived($landStore);
```
Which make it so the tile is only updated when the land in question changes.

Another change that this system allows is the ability to lazily update the computations of the land. Currently, we attach a lot of logic + computations (like changing the balance of the land) eagerly, and for every update of the store.
The delayed setup alleviates a bit the performance impact of the computations, as they are only computed every 200ms, but it is a bodge for reactivity.

We also need to create a promise for fetching the entire state, with a loader to indicate the time it is taking to synchronize the state (get the entire count + set the values)
