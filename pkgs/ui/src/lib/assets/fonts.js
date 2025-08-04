// Import font files as base64 URLs
import ponziNumberFont from '../../static/fonts/PonziNumber_Regular_G7.ttf?url';
import nintendoDSFont from '../../static/fonts/Nintendo-DS-BIOS.ttf?url';
import ponziDSRegularFont from '../../static/fonts/PonziDS_RegularV2.ttf?url';
import ponziDSSemiBoldFont from '../../static/fonts/PonziDS2_SemiBoldV3.ttf?url';

export const fonts = {
  ponziNumber: ponziNumberFont,
  nintendoDS: nintendoDSFont,
  ponziDSRegular: ponziDSRegularFont,
  ponziDSSemiBold: ponziDSSemiBoldFont
};

// CSS for font-face declarations
export const fontStyles = `
@font-face {
  font-family: 'PonziNumber';
  src: url('${ponziNumberFont}');
}

@font-face {
  font-family: 'Nintendo DS BIOS';
  font-size: small;
  font-style: normal;
  font-weight: 400;
  src: url('${nintendoDSFont}') format('truetype');
}

@font-face {
  font-family: 'PonziDS';
  font-size: small;
  font-style: normal;
  font-weight: 400;
  src: url('${ponziDSRegularFont}') format('truetype');
}

@font-face {
  font-family: 'PonziDS';
  font-style: normal;
  font-weight: 600;
  src: url('${ponziDSSemiBoldFont}') format('truetype');
}
`;