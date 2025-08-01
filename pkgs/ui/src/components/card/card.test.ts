import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Card from './card.svelte';
import CardHeader from './card-header.svelte';
import CardTitle from './card-title.svelte';
import CardDescription from './card-description.svelte';
import CardContent from './card-content.svelte';
import CardFooter from './card-footer.svelte';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default props', () => {
      const { container } = render(Card, {
        props: {
          children: 'Card content',
        },
      });

      const card = container.querySelector('div');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('bg-card');
      expect(card).toHaveTextContent('Card content');
    });

    it('applies custom class', () => {
      const { container } = render(Card, {
        props: {
          class: 'custom-card-class',
          children: 'Card',
        },
      });

      const card = container.querySelector('div');
      expect(card).toHaveClass('custom-card-class');
    });
  });

  describe('CardHeader', () => {
    it('renders with correct styles', () => {
      const { container } = render(CardHeader, {
        props: {
          children: 'Header content',
        },
      });

      const header = container.querySelector('div');
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6', 'pb-0');
    });
  });

  describe('CardTitle', () => {
    it('renders as h3 by default', () => {
      const { container } = render(CardTitle, {
        props: {
          children: 'Title text',
        },
      });

      const title = container.querySelector('h3');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Title text');
      expect(title).toHaveClass('text-lg', 'font-semibold');
    });

    it('renders with custom tag', () => {
      const { container } = render(CardTitle, {
        props: {
          tag: 'h1',
          children: 'Main title',
        },
      });

      const title = container.querySelector('h1');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Main title');
    });
  });

  describe('CardDescription', () => {
    it('renders as paragraph', () => {
      const { container } = render(CardDescription, {
        props: {
          children: 'Description text',
        },
      });

      const desc = container.querySelector('p');
      expect(desc).toBeInTheDocument();
      expect(desc).toHaveClass('text-muted-foreground');
      expect(desc).toHaveTextContent('Description text');
    });
  });

  describe('CardContent', () => {
    it('renders with padding', () => {
      const { container } = render(CardContent, {
        props: {
          children: 'Content here',
        },
      });

      const content = container.querySelector('div');
      expect(content).toHaveClass('p-6');
    });
  });

  describe('CardFooter', () => {
    it('renders with flex layout', () => {
      const { container } = render(CardFooter, {
        props: {
          children: 'Footer content',
        },
      });

      const footer = container.querySelector('div');
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });
  });
});
