import { type VariantProps, tv } from 'tailwind-variants';

export const selectVariants = tv({
  slots: {
    trigger:
      'text-xl ring-offset-background focus-visible:ring-ring aria-[invalid]:border-destructive data-[placeholder]:[&>span]:text-muted-foreground flex h-10 w-full items-center justify-between rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
    content:
      'bg-popover text-popover-foreground relative z-50 min-w-[8rem] overflow-hidden rounded-md border shadow-md outline-none',
    item: 'data-[highlighted]:bg-primary relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  },
  variants: {
    variant: {
      default: {
        trigger: 'bg-background hover:bg-accent hover:text-accent-foreground',
        content: '',
        item: '',
      },
      swap: {
        trigger:
          'bg-[#282835] text-[#D9D9D9] rounded font-ponzi-number stroke-3d-black',
        content: 'bg-[#282835] text-white',
        item: 'font-ponzi-number text-white',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type Variant = VariantProps<typeof selectVariants>['variant'];

export type SelectProps = {
  variant?: Variant;
};
