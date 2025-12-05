// Helper function to render a Svelte component in table cells
export function renderComponent<T = any>(
  component: any,
  props: T,
): { component: any; props: T } {
  return { component, props };
}
