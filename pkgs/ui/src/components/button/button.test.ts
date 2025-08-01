import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Button from './button.svelte';

describe('Button Component', () => {
  it('renders with default props', () => {
    const { getByRole } = render(Button, {
      props: {
        children: 'Click me',
      },
    });
    
    const button = getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
  });

  it('applies custom class', () => {
    const { getByRole } = render(Button, {
      props: {
        class: 'custom-class',
        children: 'Button',
      },
    });
    
    const button = getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const { getByRole } = render(Button, {
      props: {
        onclick: handleClick,
        children: 'Click me',
      },
    });
    
    const button = getByRole('button');
    await fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with different variants', () => {
    const { getByRole, rerender } = render(Button, {
      props: {
        variant: 'blue',
        children: 'Blue Button',
      },
    });
    
    let button = getByRole('button');
    expect(button).toHaveClass('button-ponzi-blue');
    
    rerender({
      props: {
        variant: 'red',
        children: 'Red Button',
      },
    });
    
    button = getByRole('button');
    expect(button).toHaveClass('button-ponzi-red');
  });

  it('renders with different sizes', () => {
    const { getByRole, rerender } = render(Button, {
      props: {
        size: 'sm',
        children: 'Small Button',
      },
    });
    
    const button = getByRole('button');
    expect(button).toHaveClass('h-[8px]');
  });
});