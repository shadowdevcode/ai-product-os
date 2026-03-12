# UI/UX Standards

This document defines the user interface and experience conventions for all products built in the AI Product OS.

Design and frontend agents must follow these standards when creating interfaces.

---

## Design Philosophy

### Core Principles
1. **Clarity over Cleverness**: Interfaces should be immediately understandable
2. **Speed is a Feature**: Optimize for perceived performance (optimistic UI, skeleton loading)
3. **Premium Feel on a Budget**: Use modern design patterns (glassmorphism, subtle animations) without heavy dependencies
4. **Dark Mode First**: Default to dark themes for developer/PM tools
5. **Mobile Consideration**: Responsive by default, even if mobile isn't the primary target

---

## Visual Design System

### Color Palette (Dark Mode Default)

#### Background Hierarchy
```css
--bg-primary: #0a0a0a       /* Main background (near-black) */
--bg-secondary: #171717     /* Cards, elevated surfaces (neutral-900) */
--bg-tertiary: #262626      /* Hover states, modals (neutral-800) */
```

#### Text Hierarchy
```css
--text-primary: #fafafa     /* Headings, primary content (neutral-50) */
--text-secondary: #d4d4d4   /* Body text, descriptions (neutral-200) */
--text-tertiary: #737373    /* Metadata, labels (neutral-500) */
--text-disabled: #404040    /* Disabled states (neutral-600) */
```

#### Accent Colors
```css
--accent-primary: #6366f1   /* Primary actions (Indigo-500) */
--accent-hover: #818cf8     /* Hover state (Indigo-400) */
--accent-danger: #ef4444    /* Destructive actions (Red-500) */
--accent-success: #10b981   /* Success states (Emerald-500) */
--accent-warning: #f59e0b   /* Warning states (Amber-500) */
```

#### Semantic Colors
- **Unblock/Urgent**: `text-red-400`, `bg-red-400/10`, `border-red-500/20`
- **Strategy/Deep Work**: `text-violet-400`, `bg-violet-400/10`, `border-violet-500/20`
- **Stakeholders/Comms**: `text-blue-400`, `bg-blue-400/10`, `border-blue-500/20`
- **Ops/Chores**: `text-emerald-400`, `bg-emerald-400/10`, `border-emerald-500/20`

---

## Typography

### Font Stack
```css
font-family:
  'Inter',
  -apple-system,
  BlinkMacSystemFont,
  'Segoe UI',
  system-ui,
  sans-serif;
```

### Scale
- **Heading 1**: `text-4xl font-bold` (36px)
- **Heading 2**: `text-2xl font-semibold` (24px)
- **Heading 3**: `text-xl font-semibold` (20px)
- **Body Large**: `text-lg` (18px)
- **Body**: `text-base` (16px)
- **Small**: `text-sm` (14px)
- **Tiny**: `text-xs` (12px)

### Font Weights
- **Bold**: 700 (headings, emphasis)
- **Semibold**: 600 (subheadings, labels)
- **Medium**: 500 (buttons, interactive elements)
- **Normal**: 400 (body text)

---

## Spacing & Layout

### Container Padding
```tsx
// Page-level container
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
```

### Card/Component Spacing
```tsx
// Cards
<div className="p-4 sm:p-6">  // Responsive padding

// Dense cards
<div className="p-3">

// List items
<div className="px-4 py-3">
```

### Gap Hierarchy
- **Tight**: `gap-1` (4px) - Related inline elements
- **Comfortable**: `gap-3` (12px) - Cards in a list
- **Spacious**: `gap-6` (24px) - Major sections
- **Section**: `gap-8` (32px) - Page-level sections

---

## Component Patterns

### Input Fields

#### Text Input (Premium Style)
```tsx
<div className="relative group">
  {/* Gradient glow on focus */}
  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500
                  rounded-2xl blur opacity-25 group-hover:opacity-40
                  transition duration-500 group-focus-within:opacity-50"></div>

  {/* Input container */}
  <div className="relative flex items-center bg-neutral-900 border
                  border-neutral-700/50 rounded-2xl shadow-xl overflow-hidden
                  focus-within:border-indigo-500/50 transition-colors">
    <input
      type="text"
      className="w-full bg-transparent px-6 py-5 text-lg text-white
                 placeholder:text-neutral-500 focus:outline-none"
      placeholder="What's on your mind?"
    />
  </div>
</div>
```

#### Simple Input
```tsx
<input
  className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700
             rounded-xl text-white placeholder:text-neutral-500
             focus:outline-none focus:border-indigo-500 transition-colors"
/>
```

---

### Buttons

#### Primary Button
```tsx
<button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600
                   text-white font-medium rounded-xl
                   transition-colors disabled:opacity-50
                   disabled:cursor-not-allowed">
  Submit
</button>
```

#### Secondary Button
```tsx
<button className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700
                   text-neutral-200 font-medium rounded-xl
                   border border-neutral-700 transition-colors">
  Cancel
</button>
```

#### Ghost Button
```tsx
<button className="px-4 py-2 text-neutral-400 hover:text-white
                   hover:bg-neutral-800/50 rounded-lg transition-colors">
  Learn More
</button>
```

#### Icon Button
```tsx
<button className="p-2 text-neutral-400 hover:text-white
                   hover:bg-neutral-800 rounded-lg transition-colors">
  <Icon className="w-5 h-5" />
</button>
```

---

### Cards

#### Standard Card
```tsx
<div className="bg-neutral-900 border border-neutral-800 rounded-xl
                p-4 shadow-sm hover:shadow-md hover:border-neutral-700
                transition-all">
  {/* Content */}
</div>
```

#### Glassmorphic Card
```tsx
<div className="bg-neutral-900/50 backdrop-blur-xl border
                border-neutral-800/50 rounded-2xl p-6 shadow-2xl">
  {/* Content */}
</div>
```

#### Interactive Card
```tsx
<div className="group bg-neutral-900 border border-neutral-800
                rounded-xl p-4 cursor-pointer transition-all
                hover:border-neutral-700 hover:shadow-lg
                hover:scale-[1.02]">
  {/* Content */}
</div>
```

---

### Tags & Badges

#### Priority Badge
```tsx
// High Priority
<span className="text-[10px] font-bold uppercase tracking-wider
                 px-2 py-0.5 rounded-sm bg-red-500/10 text-red-400">
  High
</span>

// Medium Priority
<span className="text-[10px] font-bold uppercase tracking-wider
                 px-2 py-0.5 rounded-sm bg-amber-500/10 text-amber-400">
  Medium
</span>

// Low Priority
<span className="text-[10px] font-bold uppercase tracking-wider
                 px-2 py-0.5 rounded-sm bg-neutral-800 text-neutral-400">
  Low
</span>
```

#### Count Badge
```tsx
<span className="text-xs font-mono font-medium text-neutral-500
                 bg-neutral-800/50 px-2.5 py-1 rounded-full">
  12
</span>
```

---

### Loading States

#### Skeleton Loader
```tsx
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-neutral-800 rounded w-3/4"></div>
  <div className="h-4 bg-neutral-800 rounded w-1/2"></div>
</div>
```

#### Spinner
```tsx
import { Loader2 } from 'lucide-react';

<Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
```

#### Full-Page Loading
```tsx
<div className="fixed inset-0 flex items-center justify-center
                bg-neutral-950/80 backdrop-blur-sm z-50">
  <Loader2 className="w-12 h-12 animate-spin text-indigo-400" />
</div>
```

---

### Error States

#### Inline Error Message
```tsx
<div className="mt-3 text-sm text-red-400 bg-red-500/10
                px-4 py-2 rounded-xl flex items-center gap-2
                border border-red-500/20">
  <AlertCircle className="w-4 h-4" />
  <span>Failed to save task. Please try again.</span>
</div>
```

#### Empty State
```tsx
<div className="text-center py-20 px-6">
  <div className="text-neutral-600 mb-4">
    <Icon className="w-16 h-16 mx-auto" />
  </div>
  <h3 className="text-xl font-semibold text-neutral-300 mb-2">
    No tasks yet
  </h3>
  <p className="text-neutral-500">
    Start by adding your first task above
  </p>
</div>
```

---

## Animation Standards

### Framer Motion Patterns

#### Fade In on Mount
```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {content}
</motion.div>
```

#### List Item Stagger
```tsx
<AnimatePresence>
  {items.map((item, i) => (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ delay: i * 0.05 }}
    >
      {item}
    </motion.div>
  ))}
</AnimatePresence>
```

#### Button Tap Feedback
```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  Click me
</motion.button>
```

### CSS Transitions
```css
/* Default for interactive elements */
transition-all duration-200

/* Slower, deliberate */
transition-all duration-500

/* Color-only (more performant) */
transition-colors
```

---

## Responsive Design

### Breakpoints
- **sm**: 640px (tablets)
- **md**: 768px (small laptops)
- **lg**: 1024px (desktops)
- **xl**: 1280px (large screens)
- **2xl**: 1536px (ultra-wide)

### Mobile-First Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
  {/* Auto-adjusts: 1 col on mobile, 2 on tablet, 4 on desktop */}
</div>
```

### Responsive Text
```tsx
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
  Responsive Heading
</h1>
```

---

## Icon Usage

### Lucide React (Preferred)
```tsx
import { Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

// Standard size
<Send className="w-5 h-5" />

// Large
<Icon className="w-8 h-8" />

// With color
<AlertCircle className="w-5 h-5 text-red-400" />
```

### Icon + Text Alignment
```tsx
<div className="flex items-center gap-2">
  <Icon className="w-4 h-4" />
  <span>Label</span>
</div>
```

---

## Accessibility

### ARIA Labels
```tsx
<button aria-label="Close modal">
  <X className="w-5 h-5" />
</button>
```

### Keyboard Navigation
- All interactive elements must be keyboard-accessible
- Use `tabIndex={0}` for custom interactive divs
- Trap focus in modals

### Color Contrast
- WCAG AA minimum: 4.5:1 for normal text, 3:1 for large text
- Our palette meets this by default (white/neutral-200 on dark backgrounds)

---

## Do's and Don'ts

###  Do
- Use consistent spacing (multiples of 4px)
- Provide loading states for all async operations
- Show optimistic UI updates (instant feedback)
- Use semantic HTML (`<button>` not `<div onClick>`)
- Test in dark mode (primary) and consider light mode toggle
- Animate state transitions (loading ’ content ’ empty)

### L Don't
- Use pure black (#000000) - too harsh (use #0a0a0a instead)
- Overuse animations (keep them subtle and purposeful)
- Make users wait without feedback (always show loaders)
- Use low-contrast text (neutral-700 on neutral-900 is unreadable)
- Ignore mobile - test on small screens
- Use emojis unless explicitly part of the brand

---

## Component Library

For rapid prototyping, consider:
- **Shadcn UI**: Copy-paste Radix components (accessible, customizable)
- **Headless UI**: Unstyled accessible components (by Tailwind Labs)
- **Framer Motion**: Animation library (already in stack)

Do NOT add heavy libraries like Material UI or Chakra - they conflict with custom Tailwind.

---

## Performance

### Image Optimization
```tsx
import Image from 'next/image';

<Image
  src="/avatar.png"
  alt="User avatar"
  width={40}
  height={40}
  className="rounded-full"
/>
```

### Font Loading
```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function Layout({ children }) {
  return <html className={inter.className}>{children}</html>;
}
```

---

## References

- Tailwind CSS: https://tailwindcss.com/docs
- Framer Motion: https://www.framer.com/motion
- Lucide Icons: https://lucide.dev
- WCAG Guidelines: https://www.w3.org/WAI/WCAG21/quickref/

---

This document is updated when new patterns emerge from implementations or UX postmortems.
