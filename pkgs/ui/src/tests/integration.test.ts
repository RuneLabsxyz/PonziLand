import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../index';

describe('Integration Tests', () => {
  it('all components can be imported from index', () => {
    expect(Button).toBeDefined();
    expect(Card).toBeDefined();
    expect(CardHeader).toBeDefined();
    expect(CardTitle).toBeDefined();
    expect(CardDescription).toBeDefined();
    expect(CardContent).toBeDefined();
    expect(CardFooter).toBeDefined();
  });

  it('can render a complete card with button', () => {
    const { container } = render(Card, {
      props: {
        children: [
          {
            component: CardHeader,
            props: {
              children: [
                {
                  component: CardTitle,
                  props: { children: 'Test Card' },
                },
                {
                  component: CardDescription,
                  props: { children: 'This is a test card' },
                },
              ],
            },
          },
          {
            component: CardContent,
            props: {
              children: 'Card content goes here',
            },
          },
          {
            component: CardFooter,
            props: {
              children: {
                component: Button,
                props: { children: 'Action Button' },
              },
            },
          },
        ],
      },
    });

    expect(container.textContent).toContain('Test Card');
    expect(container.textContent).toContain('This is a test card');
    expect(container.textContent).toContain('Card content goes here');
    expect(container.textContent).toContain('Action Button');
  });
});
