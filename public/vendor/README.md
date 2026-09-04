# Vendored client libraries

These are committed on purpose. The app has no build step, and serving them from
our own origin means no third-party CDN can break — or observe — a page load.
Nothing here is edited by hand; each file is copied verbatim from npm.

| Directory  | Package            | Version | File(s) copied from `dist/`                |
|------------|--------------------|---------|--------------------------------------------|
| `chartjs/` | `chart.js`         | 4.4.0   | `chart.umd.js`                              |
| `leaflet/` | `leaflet`          | 1.9.4   | `leaflet.js`, `leaflet.css`, `images/`      |
| `maplibre/`| `maplibre-gl`      | —       | `maplibre-gl.js`, `maplibre-gl.css`         |
| `daily/`   | `@daily-co/daily-js`| 0.92.2 | `daily-iframe.js`                           |
| `motion/`  | `motion`           | —       | bundled build                               |

Leaflet's stylesheet loads its marker sprites from `images/` **relative to the CSS
file**, so that directory has to sit next to `leaflet.css` — don't flatten it.

## Refreshing a library

```
npm install --no-save chart.js@<version> leaflet@<version>
cp node_modules/chart.js/dist/chart.umd.js       public/vendor/chartjs/
cp node_modules/leaflet/dist/leaflet.{js,css}    public/vendor/leaflet/
cp -r node_modules/leaflet/dist/images           public/vendor/leaflet/
```

Then update the version in the table above, and bump the query string in the views
that load it if you want to bust caches immediately (they already carry `?v=`).
