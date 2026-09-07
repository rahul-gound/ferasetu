export interface TypographyTokens {
  display: string;
  heading: string;
  subheading: string;
  body: string;
  bodySmall: string;
  label: string;
  caption: string;
  price: string;
  navigation: string;
  fontFamilyHeading: string;
  fontFamilyBody: string;
  headingWeight: string;
  bodyWeight: string;
  letterSpacingHeading: string;
  textTransformHeading: 'none' | 'uppercase' | 'capitalize';
}

export interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  sectionPadding: string;
  containerMaxWidth: string;
  cardGap: string;
}

export interface RadiusTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  pill: string;
  card: string;
  button: string;
  input: string;
}

export interface ElevationTokens {
  surface0: string;
  surface1: string;
  surface2: string;
  floating: string;
  modal: string;
  shadowCard: string;
  shadowCardHover: string;
  shadowDropdown: string;
  shadowModal: string;
}

export interface MotionTokens {
  instant: string;
  fast: string;
  normal: string;
  slow: string;
}

export const BASE_SPACING_TOKENS: SpacingTokens = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '96px',
  sectionPadding: 'clamp(48px, 8vw, 96px)',
  containerMaxWidth: '1240px',
  cardGap: '24px',
};

export const BASE_MOTION_TOKENS: MotionTokens = {
  instant: '0ms',
  fast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
  normal: '250ms cubic-bezier(0.16, 1, 0.3, 1)',
  slow: '400ms cubic-bezier(0.16, 1, 0.3, 1)',
};
