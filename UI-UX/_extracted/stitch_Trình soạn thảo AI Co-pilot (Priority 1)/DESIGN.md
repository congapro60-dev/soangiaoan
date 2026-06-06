---
name: Xanh Dương Tri Thức
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf4'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d4e4fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#414751'
  inverse-surface: '#223144'
  inverse-on-surface: '#eaf1ff'
  outline: '#717782'
  outline-variant: '#c0c7d3'
  surface-tint: '#0061a5'
  primary: '#005ea1'
  on-primary: '#ffffff'
  primary-container: '#2178c3'
  on-primary-container: '#fdfcff'
  inverse-primary: '#9fcaff'
  secondary: '#546066'
  on-secondary: '#ffffff'
  secondary-container: '#d5e2e9'
  on-secondary-container: '#58646a'
  tertiary: '#385d8e'
  on-tertiary: '#ffffff'
  tertiary-container: '#5276a8'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d2e4ff'
  primary-fixed-dim: '#9fcaff'
  on-primary-fixed: '#001d37'
  on-primary-fixed-variant: '#00497e'
  secondary-fixed: '#d8e4eb'
  secondary-fixed-dim: '#bcc8cf'
  on-secondary-fixed: '#111d22'
  on-secondary-fixed-variant: '#3c494e'
  tertiary-fixed: '#d4e3ff'
  tertiary-fixed-dim: '#a5c8ff'
  on-tertiary-fixed: '#001c3a'
  on-tertiary-fixed-variant: '#204877'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d4e4fc'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  display-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
---

## Brand & Style

The design system is centered on the concept of "Intellectual Blue" (Xanh Dương Tri Thức), evoking a sense of clarity, reliability, and academic progress. It is tailored for educators and students who require a distraction-free, professional environment for sharing and discovering lesson plans.

The aesthetic follows a **Modern Corporate** style with a touch of **Soft Minimalism**. It prioritizes readability and ease of navigation through generous whitespace, a gentle color palette, and high-quality iconography. The goal is to feel welcoming and approachable while maintaining the authority of an official educational resource. Visual cues like soft shadows and rounded corners are used to make the platform feel intuitive and "human-centric."

## Colors

The palette is anchored by a vibrant **Primary Blue** (#3182CE) which represents the "Bright Blue" requested. This is supported by a range of **Soft Backgrounds** to differentiate content sections without creating visual fatigue.

- **Primary:** Used for main actions, active navigation states, and primary brand markers.
- **Secondary (Azure Mist):** Used for large header backgrounds and subtle container highlights.
- **Tertiary (Deep Navy):** Used for high-contrast text and authoritative headings.
- **Neutral Grays:** A systematic scale used for borders, secondary text, and iconography to maintain a clean, professional appearance.
- **Semantic Colors:** Softened versions of green, yellow, and red are utilized for subject categorization (as seen in the "Explore Subjects" section) and status feedback.

## Typography

This design system utilizes two complementary typefaces: **Plus Jakarta Sans** for headings and **Inter** for body and functional text.

- **Plus Jakarta Sans** provides a friendly, contemporary geometric feel that softens the academic tone, making it approachable. It should be used for all "Discover" headlines and section titles.
- **Inter** is used for the core lesson plan content, meta-information (Grade, Subject, Author), and UI labels. It ensures maximum legibility for long-form reading and data-heavy previews.

**Responsive Scaling:**
On mobile devices, `display-lg` should scale down to `32px` (equivalent to `headline-lg` metrics) to prevent horizontal overflow and maintain visual balance.

## Layout & Spacing

The design system employs a **Fixed Grid** model for desktop and a **Fluid Fluid** model for mobile.

- **Desktop Layout:** Content is centered within a 1280px container using a 12-column grid. Gutters are fixed at 24px.
- **Mobile Layout:** Content stretches to fill the viewport width with a minimum margin of 16px on each side.
- **Spacing Rhythm:** An 8px linear scale is used to define relationships between elements. 16px (md) is the standard padding for cards and input fields, while 32px (xl) is used to separate major sections like "Explore Subjects" and "Featured Lesson Plans."
- **Stacking:** Elements within cards (images, titles, meta-tags) use the 8px (sm) unit to maintain a tight, organized grouping.

## Elevation & Depth

Visual hierarchy is primarily established through **Tonal Layering** and **Ambient Shadows**.

1.  **The Base:** The page background uses a very light gray-blue (#F7FAFC) to create contrast with surface elements.
2.  **Surfaces:** White containers (#FFFFFF) are used for cards and main content areas.
3.  **Shadows:** Shadows are highly diffused and subtle. A "Resting" card state uses a shadow with a 10% opacity blue-tinted black, 4px Y-offset, and 12px blur.
4.  **Interactive Depth:** On hover, cards should slightly lift (increase Y-offset to 8px and blur to 20px) to indicate interactivity.
5.  **Navigation:** The top header uses a "Sticky" elevation with a very fine 1px bottom border (#EDF2F7) instead of a shadow to keep the interface feeling light and "flat-modern."

## Shapes

The shape language is consistently **Rounded**, reinforcing the friendly and safe educational environment.

- **Standard Elements:** Buttons, input fields, and small thumbnails use a 0.5rem (8px) radius.
- **Large Containers:** Content cards and subject category blocks use a `rounded-lg` (1rem / 16px) radius to create a distinct, modern look.
- **Avatars & Search:** Search bars and user profile images may use a `rounded-full` (pill) style to distinguish them from content-driven containers.
- **Images:** Internal preview images within cards should have a slightly smaller radius (4px to 6px) than their parent container to maintain visual nesting harmony.

## Components

### Buttons
- **Primary:** Solid "Intellectual Blue" background with white text. High-contrast, 16px padding (left/right).
- **Secondary/Ghost:** Transparent background with a 1px Blue border or soft light blue fill. Used for "Save to Library" or "Cancel" actions.

### Cards (Lesson Plans)
- Use a white background with a 1px subtle gray border and soft shadow. 
- Headers inside cards should feature a thumbnail with a 16:9 or 4:3 aspect ratio.
- Footer area contains metadata (Grade, Author) in `body-sm` typography with neutral gray text.

### Subject Chips
- These are large, square-ish rounded blocks (64px to 80px) with central icons. 
- Each subject should have a unique pastel background color (e.g., Soft Red for English, Soft Green for Science) with a darker version of the same color for the icon.

### Input Fields
- Search bar should be a pill-shaped or highly rounded container with a soft background (#EDF2F7) and a leading magnifying glass icon.
- Focus states should use a 2px "Intellectual Blue" ring with low opacity.

### Navigation
- Top navigation links use `label-md` weight. The active link is denoted by the primary blue color and a subtle bottom weight increase or a small under-bar.