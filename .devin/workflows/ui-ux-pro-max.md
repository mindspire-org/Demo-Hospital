---
description: UI/UX Pro Max - Design intelligence workflow for professional UI/UX work
---

# UI/UX Pro Max Workflow

This workflow integrates the [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) skill for design intelligence.

## When to Use

Use this workflow when the task involves:
- UI structure or visual design decisions
- Interaction patterns or user experience quality control
- Building landing pages, dashboards, mobile apps, or any frontend interface
- Reviewing or improving existing UI/UX

## Setup

The skill repository is cloned at `.devin/skills/ui-ux-pro-max-skill/`.

## Search Commands

If Python 3 is available, run domain-specific searches from the repo:

```bash
# Generate a full design system (recommended first step)
python3 .devin/skills/ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]

# Domain searches
python3 .devin/skills/ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain> [-n <max_results>]
```

**Available domains:** `product`, `style`, `typography`, `color`, `landing`, `chart`, `ux`, `google-fonts`, `prompt`

**Available stacks:** `html-tailwind`, `react`, `nextjs`, `astro`, `vue`, `nuxtjs`, `nuxt-ui`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`

## Design Priority Rules (1-10)

Follow in order when making UI/UX decisions:

1. **Accessibility** (CRITICAL) - Contrast 4.5:1, alt text, keyboard nav, ARIA labels
2. **Touch & Interaction** (CRITICAL) - Min 44x44px targets, 8px+ spacing, loading feedback
3. **Performance** (HIGH) - WebP/AVIF, lazy loading, reserve space (CLS < 0.1)
4. **Style Selection** (HIGH) - Match product type, consistency, SVG icons (no emoji)
5. **Layout & Responsive** (HIGH) - Mobile-first, viewport meta, no horizontal scroll
6. **Typography & Color** (MEDIUM) - Base 16px, line-height 1.5, semantic color tokens
7. **Animation** (MEDIUM) - 150-300ms duration, motion conveys meaning, reduced-motion support
8. **Forms & Feedback** (MEDIUM) - Visible labels, error near field, helper text
9. **Navigation Patterns** (HIGH) - Predictable back, bottom nav <=5 items, deep linking
10. **Charts & Data** (LOW) - Legends, tooltips, accessible colors

## Common Rules for Professional UI

- **No emoji as icons** - Use vector-based icons (Lucide, etc.)
- **Touch target minimum** - >=44x44pt (iOS) or >=48x48dp (Android)
- **Tap feedback** - Provide clear pressed feedback within 80-150ms
- **Animation timing** - Micro-interactions around 150-300ms with native easing
- **Token-driven theming** - Use semantic color tokens, no hardcoded hex values
- **Safe-area compliance** - Respect top/bottom safe areas for fixed UI
- **8dp spacing rhythm** - Use 4/8dp spacing system consistently
- **Contrast parity** - Keep pressed/focused/disabled states equally distinguishable in both themes

## Pre-Delivery Checklist

Before delivering UI code, verify:

**Visual Quality**
- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from a consistent family and style
- [ ] Pressed-state visuals do not shift layout bounds
- [ ] Semantic theme tokens used consistently

**Interaction**
- [ ] All tappable elements provide clear pressed feedback
- [ ] Touch targets meet minimum size
- [ ] Micro-interaction timing in 150-300ms range
- [ ] Disabled states are visually clear and non-interactive
- [ ] Screen reader focus order matches visual order

**Light/Dark Mode**
- [ ] Primary text contrast >=4.5:1 in both modes
- [ ] Secondary text contrast >=3:1 in both modes
- [ ] Dividers/borders distinguishable in both modes
- [ ] Modal scrim opacity strong enough (40-60% black)

**Layout**
- [ ] Safe areas respected for headers, tab bars, bottom CTAs
- [ ] Scroll content not hidden behind fixed/sticky bars
- [ ] 4/8dp spacing rhythm maintained
- [ ] Long-form text measure readable on larger devices

**Accessibility**
- [ ] All meaningful images/icons have accessibility labels
- [ ] Form fields have labels, hints, and clear error messages
- [ ] Color is not the only indicator
- [ ] Reduced motion and dynamic text size supported
