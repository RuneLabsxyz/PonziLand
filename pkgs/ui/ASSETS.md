# Asset Handling in @ponziland/ui

## Important: Static Asset Constraints

When building Svelte components for npm distribution, there are important constraints regarding how assets (images, fonts, etc.) can be handled.

### ❌ What Doesn't Work

1. **Relative paths in CSS/components** - These break when the package is installed via npm:
   ```css
   /* This will NOT work in npm packages */
   background-image: url('../static/image.png');
   @font-face {
     src: url('../static/fonts/font.ttf');
   }
   ```

2. **Direct imports with ?url** - These won't resolve in consuming projects:
   ```js
   /* This will NOT work when distributed */
   import imageUrl from '../../static/image.png?url';
   ```

### ✅ Solution: Embedded Assets

All assets must be embedded as base64 strings in the JavaScript/TypeScript files within `src/lib/`. This ensures they work correctly when the package is consumed.

#### How It Works

1. **Build-time conversion**: The `scripts/build-assets.js` script converts all assets to base64
2. **Embedded in JS**: Assets are stored as base64 strings in `src/lib/assets/`
3. **Components use embedded data**: Components import and use these embedded assets

#### Example Implementation

```js
// src/lib/assets/fonts-embedded.js
export const fonts = {
  myFont: 'data:font/truetype;base64,AAEAAAALAIAAAwAwR1NVQrD+...'
};

export const fontStyles = `
@font-face {
  font-family: 'MyFont';
  src: url('\${fonts.myFont}');
}
`;
```

```svelte
<!-- Component using embedded assets -->
<script>
  import { fontStyles } from './assets/fonts-embedded.js';
</script>

<svelte:head>
  {@html `<style>${fontStyles}</style>`}
</svelte:head>
```

### Adding New Assets

1. Place your asset in the `static/` directory (note: these can't be imported directly in components)
2. Update `scripts/build-assets.js` to include your new asset
3. Run `npm run build:assets` to generate the embedded versions
4. Import and use the embedded asset in your component

### Component Guidelines

- **Always use embedded assets** for fonts, images, and other static files
- **Allow prop overrides** for customization (see Button component for example)
- **Don't reference static files directly** in components - they won't work in npm packages
- **All assets must be in src/lib/** - only this directory is packaged for distribution

### Directory Structure

```
pkgs/ui/
├── src/
│   └── lib/               # ✅ Packaged for npm
│       ├── assets/        # Embedded asset files (generated)
│       └── components/    # Svelte components
├── static/                # ⚠️ Source assets - NOT directly usable in components
│   ├── fonts/            # Source font files
│   └── ui/               # Source images
└── scripts/
    └── build-assets.js    # Converts assets to base64
```

### For Package Consumers

When using @ponziland/ui components:

1. **Fonts are included** - Components handle font loading automatically
2. **Images are embedded** - No need to copy image files
3. **Override with props** - Most components accept custom image URLs if needed:
   ```svelte
   <Button defaultImage="/my-custom-button.png" />
   ```