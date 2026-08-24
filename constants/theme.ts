// constants/theme.ts
//
// Jetons de design Yonnma — vert de la marque, style simple et arrondi,
// inspiré des apps mobiles ouest-africaines grand public (Wave, Yango) :
// beaucoup de blanc, une seule couleur d'accent, des formes douces.

export const Colors = {
  // Marque — vert clair et vif façon Spotify.
  yonn: '#1DB954', // vert principal, départ / mouvement
  yonnDark: '#127334', // pressed state
  yonnDeep: '#0C4E23', // texte / chiffres sur fond clair (contraste fort)
  yonnTint: '#E5FBED', // vert très pâle — fonds de puces, focus

  ma: '#201E1D', // texte d'ancrage

  // Neutres
  cream: '#FFFFFF', // fond des écrans
  white: '#FFFFFF',
  fill: '#F3F4F2', // fond des champs de saisie
  stone: '#8A8680', // texte secondaire
  stoneLight: '#E4E2DE', // bordures, placeholders

  // États
  danger: '#D14343',
};

// Polices d'affichage (Sora) et de texte courant (Inter).
// À charger via @expo-google-fonts/sora et @expo-google-fonts/inter,
// voir les instructions livrées avec ces fichiers.
export const Fonts = {
  display: 'Sora_700Bold',
  displaySemi: 'Sora_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Formes douces et arrondies.
export const Radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};
