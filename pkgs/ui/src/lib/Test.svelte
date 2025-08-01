<script lang="ts">
  import './Test.css';
  
  let { name1 }: { name1: string } = $props();
</script>

<div class="test-container">
  {name1}
</div>
