import type { ThemeConfig } from 'antd';

/**
 * antd, dressed in Friends Kitchen palette.
 *
 * The back office now uses antd for the controls that are genuinely hard to
 * hand-roll — Table, DatePicker, Select — but nothing about the *look* changes.
 * Every value below is the Tailwind token the old markup used, so a themed antd
 * control and a Tailwind card sit next to each other without a seam.
 *
 * Keep this in step with tailwind.config.js. If a colour moves there, move it
 * here too — there is no single source of truth for the two systems.
 */

/** Mirrors tailwind.config.js — same hexes, so the two never drift by accident. */
const C = {
  ink: '#0D0D0F',
  charcoal: '#1C1C1F',
  ash: '#76767E',
  mist: '#E9E9EE',
  cream: '#F4F4F7',
  paper: '#FFFFFF',
  amber: '#FFC72C',
  amberSoft: '#FFF6DF',
  amberDark: '#8A6000',
  flame: '#DA291C',
  leaf: '#12A150',
} as const;

/** shadow-card — the lift a focused field gets. */
const SHADOW_CARD = '0 2px 6px rgba(13,13,15,0.04), 0 10px 28px rgba(13,13,15,0.06)';
/** shadow-lift — dropdowns and the calendar panel. */
const SHADOW_LIFT = '0 8px 20px rgba(13,13,15,0.07), 0 28px 56px rgba(13,13,15,0.10)';

/** rounded-2xl on the controls, rounded-xl3 on the surfaces they open. */
const RADIUS = 16;

/**
 * Every field renders as antd's `filled` variant, which is the closest match to
 * what the hand-rolled controls did: a cream fill, no border, white on focus.
 * These three tokens are what that variant reads for its backgrounds.
 */
const filledField = {
  colorFillTertiary: C.cream, // resting fill
  colorFillSecondary: C.cream, // hover — deliberately no change, as before
  colorBgContainer: C.paper, // focus fill
  activeBorderColor: 'transparent',
  hoverBorderColor: 'transparent',
  activeShadow: SHADOW_CARD,
  // Invalid fields keep the cream fill and their normal text; the red ring is
  // added in antd-overrides.css so it shows whether or not the field has focus.
  colorErrorBg: C.cream,
  colorErrorBgHover: C.cream,
  colorErrorText: C.charcoal,
  borderRadius: RADIUS,
  borderRadiusLG: RADIUS,
};

export const adminTheme: ThemeConfig = {
  token: {
    colorPrimary: C.amber,
    colorError: C.flame,
    colorSuccess: C.leaf,
    colorInfo: C.amber,

    colorText: C.charcoal,
    colorTextHeading: C.ink,
    colorTextDescription: C.ash,
    colorTextPlaceholder: C.ash,
    colorIcon: C.ash,
    colorIconHover: C.charcoal,

    colorBgContainer: C.paper,
    colorBgElevated: C.paper,
    colorBorder: 'transparent',
    colorSplit: C.mist,

    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 14,

    controlHeight: 44, // px-4 py-3 on a 14px control — the old field height
    borderRadius: RADIUS,
    borderRadiusLG: RADIUS,
    borderRadiusSM: 12,

    boxShadowSecondary: SHADOW_LIFT,
    motionDurationMid: '0.15s',
  },

  components: {
    Input: {
      ...filledField,
      // 10 rather than the old 12: antd's line-height is 22px against
      // Tailwind's 20, and this is what lands the field back on 44px so it
      // lines up with Select and DatePicker in a filter row.
      paddingBlock: 10,
      paddingInline: 16,
      inputFontSize: 14,
    },

    Select: {
      ...filledField,
      optionSelectedBg: C.amberSoft,
      optionSelectedColor: C.charcoal,
      optionSelectedFontWeight: 600,
      optionActiveBg: C.cream,
      optionPadding: '9px 14px',
      optionFontSize: 14,
      borderRadiusLG: 20, // the dropdown card
      paddingSM: 8,
    },

    DatePicker: {
      ...filledField,
      paddingBlock: 10, // see Input — same 44px target
      paddingInline: 16,
      inputFontSize: 14,
      cellHoverBg: C.cream,
      cellActiveWithRangeBg: C.amberSoft,
      borderRadiusLG: 20, // the calendar panel
      colorPrimary: C.amber,
      // The selected day is amber; amber needs dark text to stay readable.
      colorTextLightSolid: C.amberDark,
    },

    Switch: {
      // The old toggle, to the pixel: 48×28 track, 24px knob, 2px inset.
      trackHeight: 28,
      trackMinWidth: 48,
      trackPadding: 2,
      handleSize: 24,
      handleShadow: '0 1px 2px rgba(13,13,15,0.04), 0 2px 8px rgba(13,13,15,0.04)',
      colorPrimary: C.leaf, // on
      colorPrimaryHover: C.leaf,
      colorTextQuaternary: 'rgba(118,118,126,0.4)', // off — ash/40
      colorTextTertiary: 'rgba(118,118,126,0.4)',
    },

    Pagination: {
      // The old hand-rolled page buttons: 40px pills, cream until the current
      // page, which goes solid ink.
      itemSize: 40,
      itemBg: C.cream,
      itemLinkBg: C.cream,
      itemActiveBg: C.ink,
      itemActiveColor: C.paper,
      itemActiveColorHover: C.paper,
      borderRadius: 999,
      colorText: C.charcoal,
      colorPrimary: C.ink,
      colorPrimaryHover: C.ink,
      colorBgTextHover: C.mist,
      colorBgTextActive: C.mist,
    },

    Table: {
      headerBg: 'transparent',
      headerColor: C.ash,
      headerSplitColor: 'transparent',
      headerBorderRadius: 0,
      borderColor: C.mist,
      rowHoverBg: C.cream,
      cellPaddingBlock: 16, // py-4
      cellPaddingInline: 20, // px-5
      cellFontSize: 14,
      colorText: C.charcoal,
      borderRadius: 0, // the surrounding card owns the corners
      borderRadiusLG: 0,
    },
  },
};
