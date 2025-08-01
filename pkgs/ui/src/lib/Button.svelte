<script lang="ts">
  import { twMerge } from 'tailwind-merge';
  import { type VariantProps, tv } from 'tailwind-variants';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { type ClassValue, clsx } from 'clsx';

  function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }

  const buttonVariants = tv({
    base: 'font-ponzi-number text-white flex items-center justify-center whitespace-nowrap rounded-md font-medium disabled:pointer-events-none disabled:opacity-50',
    variants: {
      variant: {
        blue: 'button-ponzi-blue stroke-3d-blue',
        red: 'button-ponzi-red stroke-3d-red',
      },
      size: {
        default: 'h-10 px-4 pb-2',
        grid: 'h-[64px] text-[32px] px-[32px] pb-[56px] pt-[48px]',
        sm: 'h-[8px] text-[4px] px-[4px] pb-[7px] pt-[6px]',
        md: 'text-xs pb-1',
        lg: 'text-3xl px-[8px] pb-2 pt-4',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'blue',
      size: 'default',
    },
  });

  type Variant = VariantProps<typeof buttonVariants>['variant'];
  type Size = VariantProps<typeof buttonVariants>['size'];

  interface ButtonProps extends HTMLButtonAttributes {
    variant?: Variant;
    size?: Size;
    class?: string;
  }

  let { 
    variant = 'blue',
    size = 'default',
    type = 'button',
    disabled = false,
    class: className,
    onclick,
    ...restProps
  }: ButtonProps = $props();
</script>

<button
  {type}
  {disabled}
  class={cn(buttonVariants({ variant, size }), className)}
  {onclick}
  {...restProps}
>
  <slot />
</button>