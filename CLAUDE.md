# Chordio Workbench

A workspace for capturing, iterating on, and sharing design prototypes with AI.

## Setup

Run `npm run sync` to download skills and configuration. This populates `.claude/skills/` with the latest Chordio skills and sets up the workspace CLAUDE.md.

After syncing, refer to the generated `CLAUDE.md` in the repo root for the full workspace documentation, folder structure, and available skills.

## Quick Start

1. **Sync skills:** `npm run sync`
2. **Create a project:** `/project create <product> <name>`
3. **Start designing:** `/design add price alerts to kayak.com/flights`
4. **View locally:** `npx chordio-local`

## Product Structure

Products use a **project-based** hierarchy. A project groups all work for a feature or initiative:

```
products/[product]/
├── product.json              # Product metadata (optional)
├── design-system/            # Product-level (shared across projects)
├── personas.json             # Product-level (shared across projects)
└── projects/
    └── [project]/
        ├── project.json      # Project metadata
        ├── research/         # Research briefs and screenshots
        ├── specs/            # Design specifications (spec.json + spec.md)
        ├── clones/           # Captured snapshots
        ├── prototypes/       # Working designs
        └── share/            # Generated videos, presentations
```

## Available Skills

| Skill | Purpose |
|-------|---------|
| `/project` | Create, list, archive, and migrate projects |
| `/design` | Capture, create, and modify prototypes |
| `/research` | Research pain points, competitors, and feature gaps |
| `/design-spec-writer` | Generate UX design specifications |
| `/review` | Review prototypes for usability/accessibility |
| `/panel-review` | Expert panel critique with inline findings |
| `/simulate-users` | Simulate user personas walking through flows |
| `/generate-video` | Generate demo videos from prototype stories |
| `/view-prototype` | Open prototype in the local viewer |
| `/extract-design-system` | Extract design tokens from captures |
| `/commit` | Commit with logical splits and conventions |
