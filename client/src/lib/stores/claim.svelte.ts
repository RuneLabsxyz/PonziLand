export let claims: {
  [key: string]: { lastClaimTime: number; animating: boolean };
} = $state({});
