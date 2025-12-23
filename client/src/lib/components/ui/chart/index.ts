import Container from './chart-container.svelte';
import ChartTooltip from './chart-tooltip.svelte';

export { Container, ChartTooltip as Tooltip };

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;
