import { type VariantProps, tv } from 'tailwind-variants';
import type { Button as ButtonPrimitive } from 'bits-ui-old';
import Root from './button.svelte';

const buttonVariants = tv({
  base: 'font-ponzi-number text-white flex items-center justify-center whitespace-nowrap rounded-md  font-medium disabled:pointer-events-none disabled:opacity-50',
  variants: {
    variant: {
      blue: 'button-ponzi-blue stroke-3d-blue',
      red: 'button-ponzi-red stroke-3d-red',
    },
    size: {
      default: 'h-10 px-4 pb-2  ',
      sm: 'h-[8px] text-[4px] px-[4px] pb-[7px] pt-[6px]',
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

type Props = ButtonPrimitive.Props & {
  variant?: Variant;
  size?: Size;
};

type Events = ButtonPrimitive.Events;

export {
  Root,
  type Props,
  type Events,
  //
  Root as Button,
  type Props as ButtonProps,
  type Events as ButtonEvents,
  buttonVariants,
};
