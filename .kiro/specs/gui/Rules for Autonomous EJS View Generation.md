When generating an EJS view for any feature task, Kiro must follow this template pattern:

Code snippet
<%- include('../partials/header', { title: 'Page Title' }) %>
<%- include('../partials/navbar') %>

<main class="container page-wrapper">
  <%- include('../partials/alerts') %>

  <header class="page-header">
    <h1>Page Title</h1>
    <p class="subtitle">Brief contextual explanation of what the user can do here.</p>
  </header>

  <section class="content-card">
    </section>
</main>

<%- include('../partials/footer') %>