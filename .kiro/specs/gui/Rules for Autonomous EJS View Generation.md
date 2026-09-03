> ⚠️ **SUPERSEDED (Phase 30 UI Haul).** This "always wrap everything in `.content-card`" template is exactly the blocky pattern we're moving away from. Do NOT follow it for new/haul work.
>
> **Use instead:** `.kiro/steering/ui-design.md` (the design-language law) + the layout-archetype system. A view should declare an archetype (`immersive` / `focused` / `dashboard` / `feed`-`split`) and use the glass component recipes — not default to a card grid.
>
> Kept here for historical reference only.

---

# (Historical) Rules for Autonomous EJS View Generation

When generating an EJS view for any feature task, the OLD template pattern was:

```ejs
<%- include('../partials/header', { title: 'Page Title' }) %>
<%- include('../partials/navbar') %>

<main class="container page-wrapper">
  <%- include('../partials/alerts') %>

  <header class="page-header">
    <h1>Page Title</h1>
    <p class="subtitle">Brief contextual explanation.</p>
  </header>

  <section class="content-card">
  </section>
</main>

<%- include('../partials/footer') %>
```

This still renders and won't break the app, but new views should follow the archetype system in `ui-design.md`.
