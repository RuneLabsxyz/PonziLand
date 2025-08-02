<script>
  import Button from '$lib/Button.svelte';
  import Test from '$lib/Test.svelte';
</script>

<div class="container">
  <h1 class="ponzi-text-stroke-black">PonziLand UI Components</h1>
  
  <section>
    <h2>Buttons</h2>
    <div class="demo-grid">
      <Button variant="blue">Blue Button</Button>
      <Button variant="red">Red Button</Button>
      <Button variant="blue" disabled>Disabled Blue</Button>
      <Button variant="red" disabled>Disabled Red</Button>
    </div>
  </section>

  <section>
    <h2>Typography</h2>
    <p class="ponzi-text-stroke-black">Text with black stroke</p>
    <p class="ponzi-text-stroke-blue">Text with blue stroke</p>
    <p class="ponzi-text-stroke-red">Text with red stroke</p>
  </section>

  <section>
    <h2>Cards</h2>
    <div class="ponzi-card">
      <h3>Card Example</h3>
      <p>This is a PonziLand styled card with custom border and texture.</p>
    </div>
  </section>

  <section>
    <h2>Test Component</h2>
    <Test />
  </section>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  section {
    margin-bottom: 3rem;
  }

  h1 {
    font-size: 2.5rem;
    margin-bottom: 2rem;
  }

  h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: var(--color-primary);
  }

  .demo-grid {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .ponzi-card {
    padding: 1.5rem;
    max-width: 400px;
  }
</style>