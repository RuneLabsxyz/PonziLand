<script lang="ts">
  import { page } from '$app/stores';

  const navItems = [
    { href: '/midgard/my-lands', label: 'My Lands' },
    { href: '/midgard/factories', label: 'Factories' },
    { href: '/midgard/tokenomics', label: 'Tokenomics' },
  ];

  function isActive(href: string, currentPath: string): boolean {
    return currentPath.startsWith(href);
  }
</script>

<nav class="flex items-center gap-2">
  {#each navItems as item}
    <a
      href={item.href}
      class={[
        'rounded px-4 py-2 text-sm font-medium transition-colors',
        {
          'bg-purple-600 text-white': isActive(item.href, $page.url.pathname),
          'text-gray-400 hover:bg-gray-700 hover:text-white': !isActive(
            item.href,
            $page.url.pathname,
          ),
        },
      ]}
    >
      {item.label}
    </a>
  {/each}
</nav>
