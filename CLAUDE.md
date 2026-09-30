# Gridfinity Generator

Public, free, open-source (MIT) website of Gridfinity tools. First tool: a generator of 3D-printable baseplates sized for a given drawer. Everything is computed in the browser, no backend.

## Where things are

- **Spec v1**: GitHub issue #1 ("Spec v1 : générateur de baseplates"). It is the source of truth for scope and decisions; work is split into tickets from it.
- **Glossary**: `CONTEXT.md` (French domain terms: baseplate, cellule, poche, muret, marge, tiroir, plateau…). Use these terms in code, issues and UI copy.
- **Decisions**: `docs/adr/` (Next.js, pocket profile 4.60 mm, monorepo with a separate geometry engine, manifold-3d with cell bricks, 3MF with deflate, provisional margin as a frame of crossbars, countersunk screws, language and units, margin in truncated cells, split for the build plate, U clips pushed up under the murets, margin shape to choose with the frame of crossbars by default, magnet holes under the crossings of the murets, type of baseplate with the tray's pockets raised on a floor).
- **Research**: `docs/research/` (extrabold reverse engineering with real export measurements, Gridfinity spec, licensing, ModuBOX).
- **Prototypes** (throwaway, kept as reference on `main`):
  - `prototypes/geometry-perf/`: manifold-3d vs JSCAD bench; verdict in `RESULTS.md`.
  - `prototypes/ui-directions/`: "Studio" UI direction; see its `README.md`.
  - `prototypes/margin-variants/`: margin variants (#3); print files for the acceptance run #16.
  - `prototypes/split/`: bench of the split for the build plate (#21): plans, engraved numbers, print files.
  - `prototypes/clips/`: bench of the clips between pieces (#22): slot, skin towards the pocket, kit of 4 graded gaps, print files.
  - `prototypes/magnets/`: bench of the magnet holes under the crossings (#24): walls around the hole, edge crossings, print files.
  - `prototypes/tray/`: bench of the tray (#25): where a bin foot stops over the floor, material, print files.

## Product principles

- **Economical and guided**: defaults are always the cheapest choice (material, hardware, print time); the tool guides newcomers to an optimized, simple result.
- **Real numbers only**: the UI shows values measured on the mesh or computed exactly, never estimates.
- **Gridfinity-compatible**: any standard bin must fit; the pocket profile follows the standard dimensions.

## Conventions

- Code and code comments in English; docs, issues and conversation in French.
- Prototypes live under `prototypes/` on `main`; they are throwaway code, not reused as-is.
- Claude Code memory is local to each machine: anything that must survive a machine switch goes in the repo or in GitHub issues.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues (`oliviermattei/gridfinitygenerator`), managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
