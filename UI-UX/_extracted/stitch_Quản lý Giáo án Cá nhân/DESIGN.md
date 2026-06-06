---
name: Dewey Editorial System
colors:
  surface: '#f9f9fc'
  surface-dim: '#dadadc'
  surface-bright: '#f9f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f6'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e5'
  on-surface: '#1a1c1e'
  on-surface-variant: '#434656'
  inverse-surface: '#2f3133'
  inverse-on-surface: '#f0f0f3'
  outline: '#737688'
  outline-variant: '#c3c5d9'
  surface-tint: '#004ee7'
  primary: '#0043c8'
  on-primary: '#ffffff'
  primary-container: '#0057ff'
  on-primary-container: '#e5e8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#5a5f68'
  on-secondary: '#ffffff'
  secondary-container: '#dee2ed'
  on-secondary-container: '#60656e'
  tertiary: '#3a3ac8'
  on-tertiary: '#ffffff'
  tertiary-container: '#5456e1'
  on-tertiary-container: '#e9e6ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#001550'
  on-primary-fixed-variant: '#003ab2'
  secondary-fixed: '#dee2ed'
  secondary-fixed-dim: '#c2c6d1'
  on-secondary-fixed: '#171c23'
  on-secondary-fixed-variant: '#424750'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#f9f9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e2e2e5'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is built for a pedagogical environment that balances academic rigor with creative flexibility. It targets educators who require a high-focus workspace for lesson planning and a vibrant, organized interface for resource sharing.

The aesthetic follows a **Modern Corporate** approach with a strong emphasis on **Functional Minimalism**. The interface prioritizes content clarity (the lesson plan) above all else, using generous whitespace and a restricted primary palette to reduce cognitive load. The emotional response is one of clarity, reliability, and structured intelligence.

- **Focus:** High-contrast typography and clear information architecture.
- **Mood:** Professional, scholarly, yet accessible and fresh.
- **Visual logic:** Structured grids, subtle depth, and intentional use of pastel accents to categorize diverse educational subjects.

## Colors

The primary color, **Bright Blue (#0057FF)**, symbolizes "Intellectual Energy" and is used for primary actions and active states. 

The color system relies heavily on a neutral scale of "Ink" and "Paper" tones to ensure the drafting experience feels natural. A specialized palette of **Subject Pastels** is utilized for categorization (chips, folder icons, and card headers), allowing users to visually parse different educational streams without overwhelming the UI with saturated hues.

- **Primary:** Bright Blue for navigation and high-priority buttons.
- **Surface:** Pure white background for the workspace, with a subtle off-white (#F8FAFC) for secondary containers.
- **Functional:** Success (Emerald), Error (Rose), and Warning (Amber) are used sparingly for validation during the lesson drafting process.

## Typography

This design system employs a dual-font strategy to maximize readability and structural hierarchy. 

1. **Manrope (Headlines):** Used for titles and section headers. Its geometric yet warm character provides a modern, professional look.
2. **Inter (Body):** The workhorse for the editor. Its high x-height and exceptional legibility ensure that long-form lesson plans remain readable even at smaller sizes.
3. **JetBrains Mono (Metadata):** Used for tags, timestamps, and lesson codes. It introduces a subtle "technical/structured" feel to the administrative side of teaching.

Strict vertical rhythm is maintained with a 4px baseline grid to ensure the editing experience feels stable and intentional.

## Layout & Spacing

The layout is centered around a **Fixed-Width Content Core** for the editor (800px) to mimic a physical page, while the rest of the application uses a **12-column Fluid Grid**.

- **Desktop:** 12 columns, 24px gutters, 32px margins. Sidebars for navigation and tools are collapsible to maximize drafting space.
- **Tablet:** 8 columns, 16px gutters, 24px margins.
- **Mobile:** 4 columns, 16px gutters, 16px margins.

We use an 8px spacing system for all component-level layouts ($spacing-1 = 8px, $spacing-2 = 16px, etc.). High-density views (like lesson lists) may drop to 4px increments for tighter grouping.

## Elevation & Depth

This design system uses **Tonal Layers** supplemented by **Soft Ambient Shadows** to define hierarchy.

- **Level 0 (Surface):** The main canvas, typically #FFFFFF.
- **Level 1 (Cards/Sidebar):** Raised slightly with a subtle border (1px #E2E8F0) and no shadow, or a very soft shadow (0px 4px 12px rgba(0,0,0,0.03)).
- **Level 2 (Dropdowns/Modals):** Floating elements with a more defined shadow (0px 12px 32px rgba(0,0,0,0.08)) to indicate interaction priority.
- **The Editor Shadow:** In the drafting view, the "page" should have a subtle 1px border to distinguish it from the workspace background, creating a tactile "sheet" effect.

## Shapes

The shape language is "Soft Professional." We avoid sharp corners to maintain friendliness, but avoid full pills to keep a sense of organized structure.

- **Buttons & Inputs:** 8px (0.5rem) corner radius.
- **Cards & Large Containers:** 12px (0.75rem) corner radius.
- **Tags/Chips:** 4px (0.25rem) for a more technical, modular look.

Interactive elements should have a consistent 1.5px border weight when in a "ghost" or "outlined" state.

## Components

### Buttons
- **Primary:** Bright Blue background, white text. Bold weight.
- **Secondary:** Light blue tint (#F0F4FF) background, Bright Blue text.
- **Drafting Tool:** Minimalist icons with tooltips; subtle grey hover states to avoid distraction during writing.

### Input Fields
- **Text Inputs:** White background, 1px border (#E2E8F0). Focus state uses a 2px Bright Blue ring with 20% opacity.
- **Rich Text Editor:** A custom toolbar that stays pinned to the top or floats; using a 1px border divider between tool groups.

### Cards
- **Lesson Card:** Features a top colored border (using the Subject Pastel palette) to indicate the category. Title in Manrope Bold, metadata in JetBrains Mono.

### Chips & Badges
- Used for "Grade Level" or "Subject." Background colors must be the Subject Pastels with slightly darker text for contrast and accessibility.

### Lists
- Lesson lists use a "Clean Row" style: ample vertical padding (16px), a subtle bottom border, and a hover state that slightly darkens the background (#F8FAFC).