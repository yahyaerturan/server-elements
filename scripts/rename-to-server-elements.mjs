#!/usr/bin/env node
/**
 * Consumer migration codemod for the 2.0 rebrand
 * "Vayes UI Core" (`vui-`) -> "Server Elements" (`se-`).
 *
 * Rewrites the old library identifiers in an application tree:
 *   - the `@vayes/ui-core` import specifier            -> `@server-elements/core`
 *   - the "Vayes UI Core" brand string                 -> "Server Elements"
 *   - any `vayes-ui-core` token (stylesheet name, the
 *     copied VERSION stamp, log prefixes)               -> `server-elements`
 *   - the `vui-` custom-element tag / CSS-class prefix  -> `se-`
 *   - the copied-asset directory segment `/vui/`        -> `/se/`
 *
 * Dry-run by default: it prints what would change and writes nothing. Pass
 * --write to apply. It does not follow into `node_modules`, `.git`, `dist` or
 * `build`, skips binary files and symbolic links, and evaluates no code.
 *
 * This is text substitution. It cannot see tag names built at runtime, markup
 * stored in a database, or minified bundles — see docs/migration-v2.md for the
 * manual checklist.
 *
 * Usage:
 *   node rename-to-server-elements.mjs [targetDir] [--write]
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';

/**
 * Ordered rewrites. Specific tokens first; the generic `vui-` and `/vui`
 * path-segment rules run last so `components/vui-modal.md` is handled as a tag.
 * @type {[RegExp, string][]}
 */
const RULES = [
    [/@vayes\/ui-core/g, '@server-elements/core'],
    [/Vayes UI Core/g, 'Server Elements'],
    [/vayes-ui-core/g, 'server-elements'],
    [/vui-/g, 'se-'],
    [/\/vui\b/g, '/se'],
];

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);

const argv = process.argv.slice(2);
const write = argv.includes('--write');
const targetArg = argv.find(argument => !argument.startsWith('--')) ?? '.';
const TARGET = resolve(targetArg);

/**
 * @param {string} dir
 * @returns {AsyncGenerator<string>} Regular-file paths, not following symlinks.
 */
async function* walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) {
                yield* walk(full);
            }
        } else if (entry.isFile()) {
            yield full;
        }
    }
}

try {
    await readdir(TARGET);
} catch {
    console.error(`Target directory not readable: ${TARGET}`);
    process.exit(1);
}

let filesChanged = 0;
let totalReplacements = 0;

for await (const full of walk(TARGET)) {
    let text;
    try {
        text = await readFile(full, 'utf8');
    } catch {
        continue;
    }
    if (text.includes('\u0000')) {
        continue; // binary
    }

    let rewritten = text;
    let count = 0;
    for (const [pattern, replacement] of RULES) {
        rewritten = rewritten.replace(pattern, () => {
            count += 1;
            return replacement;
        });
    }
    if (count === 0) {
        continue;
    }

    filesChanged += 1;
    totalReplacements += count;
    console.info(
        `${write ? 'rewrote      ' : 'would rewrite'} ${String(count).padStart(4)}  ${relative(TARGET, full)}`,
    );
    if (write) {
        await writeFile(full, rewritten);
    }
}

const mode = write ? 'written' : 'to write (dry run)';
console.info(`\n${filesChanged} file(s), ${totalReplacements} replacement(s) ${mode}.`);
if (!write && filesChanged > 0) {
    console.info('Re-run with --write to apply, then review the diff before committing.');
}
