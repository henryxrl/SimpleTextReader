# Main UI

The `main-ui/` directory contains simplified test versions of the main `index.html` file. These files are preserved to test layouts and features before applying them to production.

## Purpose

This folder serves as a sandbox for prototyping layout behavior, UI responsiveness, interaction patterns, and feature toggles in isolation.

In particular:

- `layout-v1/` is the original all-in-one prototype HTML with embedded styles and scripts.
- `layout-v2/` introduces modularization via `SidebarSplitView` — a fully reusable layout manager with CSS and JS separated.

## SidebarSplitView

The `SidebarSplitView` module implements a two-column layout with a resizable, collapsible sidebar and persistent width management. It supports:

- Drag-to-resize sidebar with min/max bounds
- Persistent width using localStorage
- Double-click to reset to default width
- Single-click toggle collapse/expand
- Optional width tooltip during drag
- `vw`-based sizing for viewport-proportional layout
- CSS variable overrides via constructor

The corresponding CSS (`sidebar-splitview.css`) contains required layout and animation rules.

## Contents

- **layout-v1/**: Initial layout experiments with inline scripts/styles
- **layout-v2/**: Modular implementation using `SidebarSplitView`
  - `layout.html` – entry HTML for testing
  - `sidebar-splitview.js` – layout manager module
  - `sidebar-splitview.css` – accompanying stylesheet
  - `use.js` – example script to initialize and test the layout
- **layout-v3/**: Adds a floating overlay centered within the main content area
  - `layout.html` – extended version with centered overlay for in-content UI elements
  - Uses the same modular layout and script structure as v2

## How to Use

- Clone and open `layout.html` in `layout-v2/` to preview features
- Adjust or override layout behavior using the `SidebarSplitView` constructor
- Use `use.js` as a quick integration reference
- Reference CSS variables to control layout proportions

## Notes

- Files in `main-ui/` are **not production code**, but are actively used for design/debug iterations.
- For deployment, only port the features you’ve validated from this module to your final app.
