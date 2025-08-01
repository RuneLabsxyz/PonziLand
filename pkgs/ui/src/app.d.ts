/// <reference types="svelte" />

declare namespace svelteHTML {
  interface IntrinsicElements {
    div: import('svelte/elements').HTMLAttributes<HTMLDivElement>;
    button: import('svelte/elements').HTMLAttributes<HTMLButtonElement>;
    p: import('svelte/elements').HTMLAttributes<HTMLParagraphElement>;
  }
}