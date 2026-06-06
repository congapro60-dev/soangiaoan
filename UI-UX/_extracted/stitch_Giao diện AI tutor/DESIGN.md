---
name: Knowledge Blue Editorial
colors:
  surface: '#f9f9ff'
  surface-dim: '#d0daf0'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d9e3f9'
  on-surface: '#121c2c'
  on-surface-variant: '#414751'
  inverse-surface: '#273141'
  inverse-on-surface: '#ebf1ff'
  outline: '#717782'
  outline-variant: '#c0c7d3'
  surface-tint: '#0061a5'
  primary: '#005ea1'
  on-primary: '#ffffff'
  primary-container: '#2178c3'
  on-primary-container: '#fdfcff'
  inverse-primary: '#9fcaff'
  secondary: '#3b6090'
  on-secondary: '#ffffff'
  secondary-container: '#a5c8ff'
  on-secondary-container: '#2e5484'
  tertiary: '#515e64'
  on-tertiary: '#ffffff'
  tertiary-container: '#6a767d'
  on-tertiary-container: '#fafdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d2e4ff'
  primary-fixed-dim: '#9fcaff'
  on-primary-fixed: '#001d37'
  on-primary-fixed-variant: '#00497e'
  secondary-fixed: '#d4e3ff'
  secondary-fixed-dim: '#a5c8ff'
  on-secondary-fixed: '#001c3a'
  on-secondary-fixed-variant: '#204877'
  tertiary-fixed: '#d8e4eb'
  tertiary-fixed-dim: '#bcc8cf'
  on-tertiary-fixed: '#111d22'
  on-tertiary-fixed-variant: '#3c494e'
  background: '#f9f9ff'
  on-background: '#121c2c'
  surface-variant: '#d9e3f9'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin: 32px
---

## Brand & Style
This design system is crafted for high-performance educational environments, focusing on the "Knowledge Blue" (#3182ce) as its core identity. The brand personality is authoritative yet accessible, combining an **Editorial** aesthetic with **Modern Minimalism**. 

The UI prioritizes content clarity and structured data visualization, evoking a sense of calm focus and academic rigor. By utilizing generous whitespace and a sophisticated typographic scale, the design system transforms complex student data and file management into an intuitive, professional experience. The visual language is "unrefined" in its simplicity but highly polished in its execution, avoiding unnecessary decoration to let the educational data speak for itself.

## Colors
The palette is anchored by **Knowledge Blue**, representing stability and intelligence. 
- **Primary (#3182ce):** Used for primary actions, progress indicators, and active states.
- **Secondary (#2c5282):** A deeper blue for navigation headers and professional emphasis.
- **Tertiary (#ebf8ff):** A soft "Blue Tint" used for background highlights, file row selection, and subtle container fills.
- **Neutral (#2d3748):** Deep charcoal for text and borders to maintain a high-contrast, editorial feel.
- **Semantic States:** Success (Green), Warning (Amber), and Error (Red) should be desaturated to fit the professional tone.

## Typography
The typography follows an editorial hierarchy. **Plus Jakarta Sans** provides a modern, geometric clarity for headlines, while **Be Vietnam Pro** offers exceptional legibility for long-form content, student records, and technical data.

- Use `display-lg` for dashboard overviews.
- Use `label-md` for table headers and file metadata descriptions.
- Ensure `body-md` is the default for student progress notes to maintain a professional, academic tone.
- Paragraph spacing should be generous to support the minimalist aesthetic.

## Layout & Spacing
The design system employs a **fixed-fluid hybrid grid**. Dashboards use a 12-column grid on desktop to organize data widgets and file lists.

- **Dashboard Layout:** 24px gutters provide breathing room between data cards.
- **File Management:** Uses a vertical list layout with 12px padding (`sm`) between rows to maximize information density without feeling cluttered.
- **Student Progress:** Employs a "Safe Margin" of 32px for mobile views to ensure focus on content.
- **Responsive Behavior:** At 768px (Tablet), the 12-column grid collapses to a 6-column grid; at 375px (Mobile), it shifts to a single column with stacked data cards.

## Elevation & Depth
This design system uses **Tonal Layers** and **Low-contrast Outlines** instead of heavy shadows to maintain its professional, minimalist character.

- **Level 0 (Surface):** The main background uses a very light gray or white.
- **Level 1 (Cards/Files):** White background with a 1px border in a soft neutral tint.
- **Interactive State:** Elements lift slightly using a very soft, diffused ambient shadow (0px 4px 12px rgba(49, 130, 206, 0.1)) when hovered, emphasizing the Knowledge Blue theme.
- **Modals:** Use a backdrop blur (glassmorphism) of 8px to maintain context while focusing on the student management task.

## Shapes
In alignment with the professional requirement, the design system utilizes a **Soft** shape language.

- **Standard Elements:** 8px (`0.5rem`) corner radius for buttons, input fields, and file thumbnails.
- **Containers:** Dashboard cards and file folders also use the 8px radius to maintain consistency.
- **Progress Bars:** Use a 4px radius for the inner track and 8px for the outer container to create a nested, refined look.

## Components

### Data Dashboard Widgets
Cards should have no visible shadows by default, only a 1px stroke. Use Knowledge Blue for primary data points and Be Vietnam Pro for the supporting labels. Charts should use a monochromatic blue scale to maintain the editorial look.

### Student Progress Status
- **Status Chips:** Use a desaturated background (Tertiary Blue) with a bold Knowledge Blue text for "In Progress." Use 8px rounded corners.
- **Progress Trackers:** Linear horizontal bars with a height of 8px. The "completed" portion is Primary Blue, while the "remaining" is a soft gray.

### File Management System
- **File Rows:** Minimalist list items with a 1px bottom border. Include a refined hover state using Tertiary Blue (#ebf8ff).
- **Icons:** Use thin-stroke (1.5px) icons. Folders should be subtle gray, only turning Primary Blue when active or containing new updates.
- **Action Buttons:** Primary buttons use a solid Knowledge Blue fill with white text. Secondary buttons use a Knowledge Blue ghost style (outline only).

### Inputs & Tables
- **Input Fields:** 8px rounded, 1px neutral border. Focus state uses a 2px Primary Blue ring.
- **Data Tables:** Editorial style with no vertical lines. Use `label-md` for headers with a subtle gray background fill.