<script>
    import { mousePosCoords } from "$lib/stores/stores";
</script>

<!-- Permanent mouse coordinates display -->
<div class="fixed top-0 right-0 bg-white p-2 rounded shadow-lg z-50">
    <p>
        Mouse: {$mousePosCoords
            ? `${$mousePosCoords.x}, ${$mousePosCoords.y}`
            : ""}
    </p>
</div>
