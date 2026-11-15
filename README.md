# Patient Diagnosis MPage

## Test locally with fabricated patients

Open `local.html` directly in a normal browser. It opens `index.html?mode=local`.
No Cerner installation, API, backend, npm install, or network connection is needed.
The banner clearly identifies synthetic mode, and patient links show local details
instead of calling PowerChart. All names, MRNs, patient IDs, and encounter IDs in
`local-data.js` are fabricated. Do not add real patient information.

Alternatively, serve this directory with any static server, for example:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/local.html>.

The fixture adapter asynchronously returns records dated today, 2, 7, 14, and 60
days ago. The default date range shows four records. Date filtering is inclusive;
use Refresh after changing dates. This local encounter-date filter demonstrates
the controls; it does not reproduce or verify the absent CCL query's semantics.
Search matches the beginning of a name, ignoring case and surrounding spaces.
Diagnosis combines with search. Click Name or Diagnosis to toggle sorting.

## Cerner mode and hosting compatibility

Opening `index.html` without `?mode=local` keeps Cerner mode as the default. Missing
Cerner APIs produce a visible error; they never silently enable synthetic mode.
The existing Discern meta declaration, `nygh_mpage_learning:group1` program,
asynchronous `XMLCclRequest`, caret-delimited parameters, and inclusive day
boundaries are retained. Patient links call `APPLINK(0, "Powerchart.exe", ...)`
with the original `/PERSONID=` and `/ENCNTRID=` arguments. The optional FIRSTTAB
construction remains in the chart helper.

`app.js` and `styles.css` are now the source of truth. They use classic relative
script/stylesheet references, with no runtime bundler, module loader, fetch, CDN,
or new JavaScript framework. A host serving the separate files must make these
relative URLs and `logo.png` accessible alongside `index.html`.

For hosts requiring the original inline-asset layout:

```sh
npm run build:mpage
```

This generates ignored `dist/index.html` with inline JS/CSS and `dist/logo.png`.
It is a local build only and does not deploy. The generated package defaults to
Cerner and excludes synthetic fixtures. Use the source `local.html` for local mode.
Keep the built file's existing host mapping when evaluating it in a Cerner test
environment; confirm asset resolution, browser-engine support and native API
behavior there before any deployment. No CCL source is included in this project.

## Automated tests

Use Node.js 20 or later:

```sh
npm ci
npm test
npm run build:mpage
```

The Node test runner and jsdom exercise the actual page scripts: synthetic loading
with Cerner globals forbidden, date ranges and validation, searching, combined
filtering, sort toggles and refresh persistence, empty states, text injection,
CCL request parameters, APPLINK arguments, response errors, and the inline build.
Dependencies are development-only; end users do not need Node.js.

These tests use fabricated records and mock the Cerner APIs. They cannot verify
clinical query correctness, authorization, real PowerChart navigation, or the
embedded Cerner browser. jsdom also does not verify visual layout or resizing.
