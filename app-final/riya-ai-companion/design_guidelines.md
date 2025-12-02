# Design Guidelines

## General Guidelines

Any general rules for design and implementation:

* Only use absolute positioning when necessary. Opt for responsive and well-structured layouts that use flexbox and grid by default
* Refactor code as you go to keep code clean
* Keep file sizes small and put helper functions and components in their own files

## Design System Guidelines

Rules for how the application should look and feel.

### Color Palette (HSL-based)

The application uses HSL (Hue, Saturation, Lightness) color system with semantic tokens for light and dark modes.

**Light Mode:**
- Background: 0 0% 99% (Off-white)
- Foreground: 0 0% 20% (Dark gray)
- Primary: 0 100% 75% (Bright coral/pink)
- Secondary: 350 100% 91% (Light pink)
- Accent: 174 72% 56% (Teal/cyan)
- Muted: 280 20% 90% (Light purple-tinted gray)
- Destructive: 0 84% 60% (Red)

**Dark Mode:**
- Background: 240 8% 12% (Very dark)
- Foreground: 0 0% 95% (Off-white)
- Primary: 0 85% 68% (Coral/pink)
- Secondary: 350 30% 30% (Dark pink)
- Accent: 174 60% 50% (Teal)
- Muted: 280 15% 22% (Dark purple-gray)
- Destructive: 0 72% 55% (Red)

### Typography

* Base font-size: 16px
* Font Families: Nunito Sans, Poppins (with fallback to sans-serif)
* Font Weight - Normal: 400
* Font Weight - Medium: 500
* Line height: 1.5 for all text

**Heading Hierarchy:**
- h1: 2xl size, medium weight
- h2: xl size, medium weight
- h3: lg size, medium weight
- h4: base size, medium weight

**Body Text:**
- Default: base size, normal weight
- Labels: base size, medium weight
- Buttons: base size, medium weight

### Border Radius

* Default radius: 0.5rem (8px)
* Small radius: 0.25rem (4px)
* Large radius: 0.75rem (12px)

### Shadow System

Multiple shadow scales for elevation:
* shadow-2xs: Subtle shadows
* shadow-xs: Light shadows
* shadow-sm: Small shadows
* shadow: Base shadow
* shadow-md: Medium shadow
* shadow-lg: Large shadow
* shadow-xl: Extra large shadow
* shadow-2xl: Maximum shadow

### Component Guidelines

#### Button

The Button component is a fundamental interactive element in the design system.

**Variants:**
* Primary: Bold, filled with primary brand color
* Secondary: Alternative styling with secondary color
* Destructive: Red background for dangerous actions
* Ghost: Minimal, transparent background
* Link: Text-only with underline effect
* Outline: Bordered variant

**Sizes:**
* sm: Small buttons
* default: Standard buttons
* lg: Large buttons
* icon: Icon-only buttons

#### Card

Containers for grouping related content with consistent padding and shadows.

**Properties:**
* Background: Card color with foreground text
* Border: Subtle border with border color
* Padding: 1.5rem
* Border Radius: 0.5rem
* Shadow: Elevation shadow

#### Form Elements

Form inputs follow consistent styling:
* Input Height: 2.25rem (36px)
* Input Border: 1px solid border color
* Input Background: Transparent or input background
* Focus State: Ring with ring color

### Spacing

Uses Tailwind's default spacing scale with consistent gaps and padding.

### Interaction Effects

The application uses the elevation system for interactions:
* **hover-elevate**: Subtle elevation on hover
* **active-elevate-2**: More dramatic elevation on click
* Automatic contrast adjustment for light/dark modes

### Dark Mode

Implemented using CSS classes:
* Light mode: Default (root)
* Dark mode: Add `.dark` class to `<html>` element
* All colors automatically adjust via CSS variables

