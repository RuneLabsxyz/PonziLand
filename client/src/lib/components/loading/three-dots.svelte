<script lang="ts">
  let text = $state('.');
  // rotate between 1 2 & 3 dots
  $effect(() => {
    const interval = setInterval(() => {
      if (text === '') {
        text = '.';
      } else if (text === '.') {
        text = '..';
      } else if (text === '..') {
        text = '...';
      } else {
        text = '';
      }
    }, 500);

    return () => clearInterval(interval);
  });
</script>

<span>{text}</span>
