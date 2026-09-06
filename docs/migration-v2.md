# Migrating to Server Elements 2.0

Version 2.0 renames the library. It was **Vayes UI Core** (`vui-`,
`@vayes/ui-core`); it is now **Server Elements** (`se-`, `@server-elements/core`).

This is a **hard cut**: the old names are gone, with no compatibility aliases and
no deprecation period. Nothing about how the library _behaves_ changed — only the
identifiers. For a small application the move is mostly automated; budget 15–30
minutes.

---

## What changed

| 1.x                                                                                     | 2.0                                                                                |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `<vui-modal>`, `<vui-tabs>`, `<vui-counter>`, `<vui-toggle>`, `<vui-customer-selector>` | `<se-modal>`, `<se-tabs>`, `<se-counter>`, `<se-toggle>`, `<se-customer-selector>` |
| CSS classes `.vui-*`                                                                    | `.se-*`                                                                            |
| import `@vayes/ui-core` (+ `/ci4`, `/actions`, `/components/*`)                         | `@server-elements/core` (+ the same subpaths)                                      |
| stylesheet `vayes-ui-core.css`                                                          | `server-elements.css`                                                              |
| default element prefix `vui-` (from `setAllowedPrefixes`)                               | `se-`                                                                              |
| diagnostics log prefixes `[vui:http]`, `[vui:event]`                                    | `[se:http]`, `[se:event]`                                                          |
| copied-asset directory `public/assets/vui/`                                             | `public/assets/se/`                                                                |

**Unchanged:** the entire runtime API. Every method, attribute, property and
event name is identical — only the tag, prefix, package and stylesheet spelling
moved. If you declared your own prefix with `setAllowedPrefixes(['your-'])`, that
is untouched.

---

## Step 1 — Update the dependency

```bash
npm install github:yahyaerturan/server-elements#v2.0.0
```

The import specifier changes (the codemod in Step 2 does this for you):

```js
import { Component, define } from '@server-elements/core';
import { createCodeIgniterClient } from '@server-elements/core/ci4';
import '@server-elements/core/components/common/Modal.js';
```

If you **copied the files** instead of using a package manager (Route A in
[installation.md](installation.md)), re-copy `resources/js` and `resources/css`
from the 2.0 release over your assets directory rather than editing the old copy
in place.

## Step 2 — Run the codemod

The package ships a codemod that rewrites your markup, CSS and JS. It is
**dry-run by default** — it prints what would change and writes nothing:

```bash
# preview
node node_modules/@server-elements/core/scripts/rename-to-server-elements.mjs path/to/your/src

# apply
node node_modules/@server-elements/core/scripts/rename-to-server-elements.mjs path/to/your/src --write
```

It rewrites `@vayes/ui-core` → `@server-elements/core`, `vayes-ui-core` →
`server-elements` (stylesheet, VERSION stamp), `vui-` → `se-`, the `/vui/` asset
path → `/se/`, and the "Vayes UI Core" string → "Server Elements". Point it at
your **source** tree — not at `node_modules`, a vendored copy of the library, or
a minified bundle. Review the diff before committing.

## Step 3 — Handle what a codemod cannot see

The codemod is text substitution. Check these by hand:

- **Tags built from strings** on the server — templating that concatenates a tag
  name (`"<vui-$kind>"`) or a view helper that emits `vui-` tags.
- **Markup or CSS stored in a database**, a CMS field, or an email template.
- **Class or tag names constructed at runtime** (`'vui-' + name`).
- **`querySelector` / `customElements.get('vui-…')`** called with a variable.
- **Tests** that assert on tag names, accessible names, or snapshots.
- **Server config or CSP** that allow-lists `vui-*` element names.

## Step 4 — Verify

```bash
# nothing old should remain in your source
grep -rn "vui-\|@vayes/ui-core\|vayes-ui-core" path/to/your/src
```

Then load a page and confirm each component upgrades. In the console:

```js
customElements.get('se-modal'); // a constructor, not undefined
```

and no `does not use an allowed component prefix` error appears. Run your tests.

---

## If you cannot migrate yet

Pin the previous line:

```bash
npm install github:yahyaerturan/server-elements#v1.4.0
```

The 1.x line keeps the `vui-` names and is otherwise unchanged; it receives no
new features. Because the API is identical, migrating later stays mechanical.
