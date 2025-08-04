import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Ensure dist/assets directory exists
mkdirSync(join(rootDir, 'dist/assets'), { recursive: true });

// Read and convert font files to base64
const fonts = {
  ponziNumber: readFileSync(join(rootDir, 'static/fonts/PonziNumber_Regular_G7.ttf')).toString('base64'),
  nintendoDS: readFileSync(join(rootDir, 'static/fonts/Nintendo-DS-BIOS.ttf')).toString('base64'),
  ponziDSRegular: readFileSync(join(rootDir, 'static/fonts/PonziDS_RegularV2.ttf')).toString('base64'),
  ponziDSSemiBold: readFileSync(join(rootDir, 'static/fonts/PonziDS2_SemiBoldV3.ttf')).toString('base64'),
};

// Read and convert button images to base64
const buttonImages = {
  blueDefault: readFileSync(join(rootDir, 'static/ui/button/blue/default.png')).toString('base64'),
  blueHover: readFileSync(join(rootDir, 'static/ui/button/blue/hover.png')).toString('base64'),
  redDefault: readFileSync(join(rootDir, 'static/ui/button/red/default.png')).toString('base64'),
  redHover: readFileSync(join(rootDir, 'static/ui/button/red/hover.png')).toString('base64'),
};

// Create fonts.js with embedded base64 data
const fontsContent = `// Auto-generated file with embedded font data
export const fonts = {
  ponziNumber: 'data:font/truetype;base64,${fonts.ponziNumber}',
  nintendoDS: 'data:font/truetype;base64,${fonts.nintendoDS}',
  ponziDSRegular: 'data:font/truetype;base64,${fonts.ponziDSRegular}',
  ponziDSSemiBold: 'data:font/truetype;base64,${fonts.ponziDSSemiBold}'
};

export const fontStyles = \`
@font-face {
  font-family: 'PonziNumber';
  src: url('\${fonts.ponziNumber}');
}

@font-face {
  font-family: 'Nintendo DS BIOS';
  font-size: small;
  font-style: normal;
  font-weight: 400;
  src: url('\${fonts.nintendoDS}') format('truetype');
}

@font-face {
  font-family: 'PonziDS';
  font-size: small;
  font-style: normal;
  font-weight: 400;
  src: url('\${fonts.ponziDSRegular}') format('truetype');
}

@font-face {
  font-family: 'PonziDS';
  font-style: normal;
  font-weight: 600;
  src: url('\${fonts.ponziDSSemiBold}') format('truetype');
}
\`;
`;

// Create button-images.js with embedded base64 data
const buttonImagesContent = `// Auto-generated file with embedded button image data
export const buttonImages = {
  blue: {
    default: 'data:image/png;base64,${buttonImages.blueDefault}',
    hover: 'data:image/png;base64,${buttonImages.blueHover}'
  },
  red: {
    default: 'data:image/png;base64,${buttonImages.redDefault}',
    hover: 'data:image/png;base64,${buttonImages.redHover}'
  }
};
`;

// Write the generated files
writeFileSync(join(rootDir, 'src/lib/assets/fonts-embedded.js'), fontsContent);
writeFileSync(join(rootDir, 'src/lib/assets/button-images-embedded.js'), buttonImagesContent);

console.log('Assets embedded successfully!');