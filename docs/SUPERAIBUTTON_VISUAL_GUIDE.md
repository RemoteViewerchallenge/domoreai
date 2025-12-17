# SuperAiButton - Visual State Guide

## State Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SuperAiButton States                      │
└─────────────────────────────────────────────────────────────┘

                         ┌─────────┐
                         │  IDLE   │ ← Default state
                         │ ✨ (32px)│   Pulsing animation
                         └────┬────┘
                              │
                 ┌────────────┼────────────┐
                 │            │            │
           (click)      (right-click)     │
                 │            │            │
                 ▼            ▼            │
         ┌───────────┐   ┌────────┐       │
         │  ACTIVE   │   │  MENU  │       │
         │ [Input──→]│   │ ┌─┬─┬─┐│       │
         │  (300px)  │   │ │R│C│E││       │
         └─────┬─────┘   └──┬─┴─┴─┘       │
               │            │             │
          (Enter/→)    (click tool)       │
               │            │             │
               │      ┌─────┴─────┐       │
               │      │           │       │
               │      ▼           ▼       │
               │  ┌────────┐  ┌────────┐ │
               │  │ ROLES  │  │ CONFIG │ │
               │  │ ┌─┬──┐ │  │ Info   │ │
               │  │ │I│RR│ │  │ Panel  │ │
               │  │ │C│OO│ │  └────────┘ │
               │  │ │O│LL│ │             │
               │  │ │N│EE│ │             │
               │  │ │S│SS│ │             │
               │  └─┴─┴──┘ │             │
               │            │             │
               └────────────┴─────────────┘
                            │
                       (Esc/X/click)
                            │
                            ▼
                       Back to IDLE
```

## State Details

### 1. IDLE State
```
┌──────────┐
│    ✨    │  • 32x32px circular button
│  (glow)  │  • Gradient: primary → purple
└──────────┘  • Pulsing animation (2s loop)
              • Shadow: 0_0_15px primary
              • Hover: scale(1.1)
```

### 2. ACTIVE State
```
┌────────────────────────────────────────────────────────┐
│ ✨ │ Command the AI...                            │ → │
└────────────────────────────────────────────────────────┘
  14px  300px input area                            14px
  
• Expands from 32px to 300px (spring animation)
• Background: background-secondary/95 + backdrop-blur
• Border: primary/50 with glow
• Input: 12px text, transparent background
• Submit: ArrowRight icon (or spinner if loading)
```

### 3. MENU State
```
        ┌──────────────────┐
        │  ┌────┬────┬────┐│
        │  │ 👤 │ ⚙️ │ ⚡ ││
        │  │Role│Conf│Evnt││
        │  └────┴────┴────┘│
        └──────────────────┘
        
• Floating panel (auto-positioned)
• 3-column grid, 48x48px buttons
• Icons: 14px, Labels: 9px
• Padding: 4px (p-1)
• Background: background-secondary/95
• Border: border color
```

### 4. ROLE_SELECT State
```
┌────────────────────────────────┐
│ SELECT ROLE                  X │ ← Header (10px)
├─┬──────────────────────────────┤
│I│ Frontend Lead                │
│C│ Backend Architect            │
│O│ DevOps Engineer              │
│N│ Data Scientist               │
│S│ Product Manager              │
│ │ ...                          │
└─┴──────────────────────────────┘
8px  256px roles list

• Left column: 8px category icons
• Right column: Role names (10px)
• Selected: primary/20 background + dot
• Hover: primary/10 background
• Max height: 224px (56 * 4)
• Scrollable with custom scrollbar
```

### 5. CONFIG State
```
┌────────────────────────────────┐
│ CONFIGURATION              X   │
├────────────────────────────────┤
│ Context ID:         workspace_1│
│ Selected Role:             auto│
│                                │
└────────────────────────────────┘

• Shows current context info
• 10px text, 9px code blocks
• Minimal padding (12px)
• Same dimensions as role panel
```

## Interaction Flows

### Flow 1: Quick Command
```
IDLE → (click) → ACTIVE → (type + Enter) → IDLE
  ✨              [Input]                    ✨
```

### Flow 2: Select Role Then Command
```
IDLE → (right-click) → MENU → (click Roles) → ROLE_SELECT
  ✨                    [R|C|E]                [Icons|Roles]
                                                    ↓
                                            (select role)
                                                    ↓
                                                  MENU
                                                    ↓
                                            (click outside)
                                                    ↓
                                                  IDLE
```

### Flow 3: Check Config
```
IDLE → (right-click) → MENU → (click Config) → CONFIG → (X) → MENU
  ✨                    [R|C|E]                 [Info]
```

## Positioning Examples

### Bottom-Center (expandUp=true)
```
┌─────────────────────────────────────────┐
│                                         │
│         ┌──────────────┐                │
│         │ ROLE_SELECT  │                │
│         │ ┌─┬────────┐ │                │
│         │ │I│Roles   │ │                │
│         │ │C│List    │ │                │
│         └─┴─┴────────┘ │                │
│                ↑                         │
│         ┌──────┴──────┐                 │
│         │  [R│C│E]    │                 │
│         └──────┬──────┘                 │
│                ↑                         │
│              ┌─┴─┐                       │
│              │ ✨ │                       │
│              └───┘                       │
└─────────────────────────────────────────┘
```

### Top-Right (expandUp=false)
```
┌─────────────────────────────────────────┐
│                              ┌─┐         │
│                              │✨│         │
│                              └┬┘         │
│                               ↓          │
│                        ┌──────┴──────┐   │
│                        │  [R│C│E]    │   │
│                        └──────┬──────┘   │
│                               ↓          │
│                     ┌─────────┴────────┐ │
│                     │ ROLE_SELECT      │ │
│                     │ ┌─┬────────────┐ │ │
│                     │ │I│Roles       │ │ │
│                     │ │C│List        │ │ │
│                     └─┴─┴────────────┘ │ │
│                                         │
└─────────────────────────────────────────┘
```

## Size Specifications

### Button Sizes
```
Idle:        32 x 32 px  (h-8 w-8)
Active:     300 x 32 px  (w-[300px] h-8)
Menu:       160 x 56 px  (min-w-[160px])
Role Panel: 256 x 224 px (w-64 max-h-56)
Config:     256 x auto   (w-64)
```

### Font Sizes
```
Button icon:     16px (size={16})
Menu icon:       14px (size={14})
Menu label:       9px (text-[9px])
Input text:      12px (text-xs)
Panel header:    10px (text-[10px])
Role name:       10px (text-[10px])
Role desc:        9px (text-[9px])
Config text:     10px (text-[10px])
Config code:      9px (text-[9px])
```

### Spacing
```
Button padding:    0px (no padding, icon centered)
Menu padding:      4px (p-1)
Menu gap:          4px (gap-1)
Panel padding:     8px (px-2 py-1)
Content padding:  12px (p-3)
Icon column:       8px (w-8)
```

## Color Variables

```css
/* Used in SuperAiButton */
--color-primary          /* Main accent color */
--color-background       /* Base background */
--color-background-secondary /* Panel backgrounds */
--color-text             /* Main text */
--color-text-secondary   /* Muted text */
--color-border           /* Border color */
```

## Animation Timings

```typescript
// State transitions
spring: { stiffness: 300-400, damping: 25-30 }

// Icon rotation
duration: 0.15s

// Pulsing (idle)
duration: 2s, repeat: Infinity

// Loading spinner
duration: 1s, repeat: Infinity, ease: 'linear'

// Expand/collapse
type: 'spring', stiffness: 300, damping: 30
```

## Accessibility

- **Keyboard**: Full keyboard navigation (Enter, Escape, Tab)
- **Focus**: Visible focus states on all interactive elements
- **ARIA**: Title attributes for icon-only buttons
- **Screen readers**: Semantic HTML structure
- **Color contrast**: Meets WCAG AA standards

## Responsive Behavior

- **Mobile**: Same size, touch-friendly (48px min touch target)
- **Tablet**: Same behavior, optimized for touch
- **Desktop**: Hover states, keyboard shortcuts
- **Large screens**: Maintains compact size, doesn't scale up

---

This visual guide provides a complete reference for understanding and implementing the SuperAiButton component.
