<script lang="ts">
  let { active, children, onclick } = $props();
</script>

<button {onclick} class={`text-ponzi toolbar-button ${active ? 'active' : ''}`}>
  {@render children?.()}
</button>

<style>
  .toolbar-button {
    background-image: url('/ui/toolbar/default.png');
    background-size: cover;
    height: 4rem;
    width: 4rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .toolbar-button:hover {
    background-image: url('/ui/toolbar/hover.png');
  }

  .toolbar-button.active {
    background-image: url('/ui/toolbar/active.png');
    color: #ff0;
  }
</style>
