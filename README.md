# dsh-compaction-counter

A DeepSeek Harness plugin that shows how many times the current session's
context has been compacted, next to the context meter under the composer.

```
4 turns 432 steps · 168 tok/s   74.3M tok · Cache hit 95%   30%   Compactions: 1
```

## What it counts

One count per **successful** compaction of the current session.

| Event | Counted | Why |
|---|---|---|
| `compaction/summary` | yes | Appended inside the synchronous commit step, together with the replacement body, so a failed attempt closes with `compaction/end` carrying an `error` and never produces a summary. |
| `compaction/end` with `error` | no | A failed attempt records the error and no summary. |
| `compaction/prune` | no | A tool-result prune is not a compaction of the conversation. |
| inherited prefix of a forked session | no | Those compactions belong to the parent session, not the fork. |

The count is a durable session projection, so it survives a reload and a
reopened session: the host recomputes it from the session log.

## Install

From a local checkout:

```sh
dsh plugin --profile web add "link:<absolute path to this directory>"
```

The plugin ships its own bundle patch, so the installation appends it to the
profile's `dsh.profile.bundles` selection. Restart `dsh web` afterwards, then
hard-refresh the browser.

The plugin does not touch the compaction behavior, the compaction
configuration, or the platform bundle: it adds one projection unit and one
composer-dock entry.

## How it works

**Host half** (`index.js`) registers one projection unit, `compactionCount`,
on `ctx.sessionProjections`. The unit is a pure fold over the committed
session events; the client receives its whole value through the standard
projection channel.

**Client half** (`client.js`) registers one entry into the platform's
`conversation.composer.dock` slot — the same official slot the shipped
activity and usage pills use. The entry reads the `compactionCount` projection
through the session standard `useProjection` seat, so it renders nothing when
the host half is not mounted.

**Placement.** The platform renders the whole dock slot before the standard
context ring, so a slot entry's own `order` cannot place the reading on the
ring's right — it always lands to the ring's left. The entry therefore also
sets the CSS `order: 1` on its own element. The dock is a flex row whose
standard ring carries no `order` (the default 0), so this moves the reading
past the ring while the shipped pills keep theirs. The visual order then
differs from the DOM order, which is the accepted trade for a reading that is
not interactive.

The copy follows the browser's language preference, picked once at load
(Chinese for a `zh` primary subtag, English otherwise). It does not consult
the DSH Language setting, and a language change takes effect on reload.

## Development

```sh
npm install
npm test    # unit and host-integration tests
npm run check
```

`tests/projection.test.mjs` covers the fold in isolation. `tests/host-integration.test.mjs`
runs the unit against the real `@deepseek-ai/dsh-session` and
`@deepseek-ai/dsh-session-projection` packages, including the fork case.

### zod

The plugin's own `zod` dependency is floored at `^4.6.6`, the first release
carrying the fix for CVE-2023-54404 (uncontrolled resource consumption
through unbounded array validation). The plugin validates numbers and objects
only, so the vulnerable array path is not reachable here, but the floor keeps
a patched version in every install.

The `overrides` entry pins the same version for the transitive copies the DSH
development dependencies bring in, so the whole tree resolves to one patched
`zod`. It applies to this package's own install only; the DSH packages keep
their own `zod` pins.

## Compatibility

| DSH version | Verification |
| --- | --- |
| 0.2.1-rc.2 | Declared lower bound of `engines.dsh`; not re-verified in this pass |
| 0.2.2-alpha.2 | `apply` migrated to `await ctx.sessionProjections.register(...)` and the host-integration test reads state through the registration handle; `engines.dsh` extended with the explicit `0.2.2-alpha.2` target and devDependencies repinned to `@deepseek-ai/dsh-session`/`@deepseek-ai/dsh-session-projection` 0.2.2-alpha.2 (cordis 4.0.6-alpha.1); `npm run check` and 8/8 `npm test` passing on 2026-10-29; live-verified on the 0.2.2-alpha.2 runtime on 2026-10-29: dock label renders, count increments once on a successful `/compact`, stays unchanged after a failed compaction, and the count survives page reload and session re-entry; fork independence is covered by tests only |

Other newer DSH versions are not assumed compatible until verified.

## License

MIT
