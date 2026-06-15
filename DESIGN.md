# Smart Lesson Plan AI - Design System (Taste Skill)

This document outlines the core visual identity, design tokens, and frontend principles for the Smart Lesson Plan AI web application. 
**Agent Instruction:** All agents (Antigravity, Cline) MUST reference this file before modifying or creating any UI components to ensure visual consistency.

## 1. Core Philosophy
- **Clean & Editorial:** The interface should feel like reading a high-quality educational paper.
- **Glassmorphism (Subtle):** Use soft blurs and gradients to create a sense of depth and modernity.
- **Focus over Flash:** Animations should guide the eye, not distract.

## 2. Typography
We use two main fonts loaded from Google Fonts:
- **Headings & Primary Text:** `Plus Jakarta Sans`, sans-serif (Weights: 500, 600, 700, 800)
- **Secondary/Body Text:** `Be Vietnam Pro`, sans-serif (Weights: 400, 500, 600)
- **CSS Variable:** `font-family: var(--font-sans);`

## 3. Color Palette (Tokens)

### Brand Colors (Dewey Blue)
- **Primary:** `#3182ce` (`var(--dewey-blue)`)
- **Lightest (Bg):** `#ebf8ff` (`var(--dewey-blue-50)`)
- **Light (Highlight):** `#bee3f8` (`var(--dewey-blue-100)`)
- **Dark (Hover):** `#2b6cb0` (`var(--dewey-blue-700)`)

### Neutral & Text Colors
- **Text Primary (Ink):** `#102033` (`var(--dewey-ink)`)
- **Text Secondary (Muted):** `#64748b` (`var(--dewey-muted)`)
- **Card Background:** `#ffffff` (`var(--dewey-paper)`)
- **Page Background:** `#f7fafc` (`var(--dewey-canvas)`)
- **Borders/Lines:** `#e2e8f0` (`var(--dewey-line)`)

### Gradients
- **Primary Gradient:** `linear-gradient(135deg, #3182ce 0%, #2c5282 100%)` (`var(--pro-gradient)`)
- **Background Gradient:** `radial-gradient(circle at top left, rgba(49, 130, 206, 0.14), transparent 32%), linear-gradient(180deg, #f8fbff 0%, #f7fafc 100%)` (`var(--editorial-gradient)`)

## 4. UI Components & Tailwind Utilities

### Cards (`.pro-card`)
- **Background:** White
- **Border Radius:** `28px` (`rounded-3xl`)
- **Border:** `1px solid rgba(226, 232, 240, 0.86)`
- **Shadow:** `var(--card-shadow)`
- **Hover State:** Slightly deeper shadow and blue-tinted border.

### Buttons
- **Primary Button (`.dewey-button-primary`):** Uses the `pro-gradient` with white text and a soft shadow.
- **Tailwind Approach:** Focus rings must use `--dewey-focus-ring` to ensure brand consistency.

### Glassmorphism (`.glass`)
- **Background:** `rgba(255, 255, 255, 0.78)`
- **Backdrop Filter:** `blur(16px)`
- Use for floating headers, sticky navbars, or modal overlays.

## 5. Spacing & Layout
- **Container:** Maximum width should be constrained (e.g., `max-w-7xl` or `max-w-5xl`) to maintain readability.
- **Padding:** Use generous padding inside cards (`p-6` or `p-8`).
- **Gaps:** Use `gap-4` or `gap-6` for standard flex/grid layouts.

## 6. Development Rules for Agents
1. **Never use hardcoded hex colors** unless defining a new token in `index.css`. Always use the Tailwind equivalents or CSS variables mapped above.
2. **Icons:** Use `lucide-react` (Stroke width: 2.0).
3. **Animations:** Use `framer-motion` for transitions (e.g., `layout` prop for list changes, `initial={{ opacity: 0, y: 10 }}` for entrance animations). Keep durations around `0.2s - 0.3s`.
4. **Responsive:** Always test mobile views. Use `flex-col` on mobile and `md:flex-row` on larger screens.
5. **Print Layout:** If building printable components (like exams), ensure you use the `.no-print` class for UI controls and wrap content in `.exam-paper` or `.report-paper` classes as defined in `index.css`.
