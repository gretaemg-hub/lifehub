// The single source of truth for the app's warm, homey palette — pulled
// out of Login.jsx so every screen (not just sign-in) shares it, instead
// of each page inventing its own colors and ending up looking like a
// different, more clinical product once you're actually inside the app.
export const theme = {
  bg: '#EEF1E7',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F5EE',
  ink: '#26312B',
  inkSoft: '#5B6960',
  inkFaint: '#A9B2A4',
  pine: '#3E6259',
  pineDark: '#2A453D',
  mustard: '#D9A441',
  mustardDark: '#C4933A',
  line: '#DDE3D6',
  danger: '#C0392B',
  dangerBg: '#FBEAEA',
  success: '#2A453D',
  successBg: '#EAF3EE',
};

// Reusable inline-style fragments for the bits that repeat on every
// screen — a themed text input, a primary button, a secondary/outline
// button, and the card every page sits inside. Kept as plain style
// objects (not styled-components or CSS modules) to match how the rest
// of the app already works — no new dependency needed.
export const inputStyle = {
  fontFamily: 'inherit',
  fontSize: 15,
  padding: '12px 14px',
  borderRadius: 10,
  border: `1.5px solid ${theme.line}`,
  background: theme.bg,
  color: theme.ink,
};

export const primaryButtonStyle = {
  fontFamily: 'inherit',
  padding: '12px 20px',
  background: theme.pine,
  color: 'white',
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
  transition: 'background 0.15s',
};

export const secondaryButtonStyle = {
  fontFamily: 'inherit',
  padding: '10px 18px',
  background: 'transparent',
  color: theme.pine,
  border: `1.5px solid ${theme.line}`,
  borderRadius: 10,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
  transition: 'border-color 0.15s, color 0.15s',
};

export const cardStyle = {
  background: theme.surface,
  borderRadius: 18,
  boxShadow: '0 6px 20px rgba(38, 49, 43, 0.08)',
  padding: '28px 26px',
};

export const headingFont = "'Fraunces', serif";
export const bodyFont = "'Inter', sans-serif";

// Same order as the friends-demo's AVATAR_COLORS (index.html) — red →
// orange → gold → green → teal → blue → violet → pink — so a household
// member's avatar looks the same whether they picked it in the demo or
// the real app.
export const AVATAR_COLORS = [
  '#E34948',
  '#EA612B',
  '#BA7E00',
  '#008300',
  '#189D6E',
  '#2A78D6',
  '#4A3AA7',
  '#E2588C',
];
