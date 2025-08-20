<script>
  import { PUBLIC_BASE_PATH } from '$env/static/public';
  let { imageUrl = '/placeholder-image.png', maskProgress = 0 } = $props();
</script>

<div class="image-loader">
  <div class="image-container">
    {#key imageUrl}
      <img src={PUBLIC_BASE_PATH + imageUrl} alt="Loader background" class="background-image" />
      <img
        src={PUBLIC_BASE_PATH + imageUrl}
        alt="Loader foreground"
        class="foreground-image"
        style="clip-path: inset(0 {100 - maskProgress}% 0 0)"
      />
    {/key}
  </div>
</div>

<style>
  .image-loader {
    position: relative;
    width: 300px;
    height: 200px;
    overflow: hidden;
  }

  .image-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .background-image,
  .foreground-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .background-image {
    opacity: 0.3;
  }

  .foreground-image {
    opacity: 1;
    transition: clip-path 300ms ease-in-out;
  }
</style>
