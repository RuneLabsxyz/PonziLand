Inside of land-info/buy-sell-form.svelte, add an "advisor".

An Advisor is a series of notes / toasts using the following HTML for styling:

```html
<Card class="bg-red-600/50 ponzi-bg bg-blend-overlay m-0 mt-4">
  <div class="flex justify-stretch">
    <img
      src="/ui/icons/Icon_ShieldRed.png"
      alt="Shield Red Icon"
      class="w-8 h-8 mr-2"
    />

    <span class="text-lg"> THIS IS A RED WARNING </span>
  </div>
</Card>

<Card class="bg-orange-300/50 ponzi-bg bg-blend-overlay m-0 mt-4">
  <div class="flex justify-stretch">
    <img
      src="/ui/icons/Icon_ShieldOrange.png"
      alt="Shield Orange Icon"
      class="w-8 h-8 mr-2"
    />

    <span class="text-lg"> THIS IS A WEAK WARNING </span>
  </div>
</Card>
```

The advisor should show those in the following conditions:

- If the payback time is longer than the time to nuke by more than 10% (means that you potentially loose 10% of the revenue if your land goes to nuke)
  - Weak warning
  - The message should be: `Your land will be nuked before you get back the price you bought it for. You can increase stake, or add more stake frequently to avoid losing your land`
- If the sell profit is less than the buy price (means that you potentially loose money if your land goes to sell)
  - Weak warning if between -10% and -20%
  - Strong warning if above -20%
  - The message should be: `If your land is bought by another player, you will get ${sellPriceUsd}, which is ${amount} less than what you will be spending to buy the land.`
- If you pay more in taxes than what you get back (means that the sell price is too high)
  - Weak warning
  - The message should be: `You are spending more in taxes than what you are getting from your neighbors. Decrease the sell price to turn a profit.`
