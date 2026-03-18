# Chordio Workbench

A workspace for capturing, iterating on, and sharing design prototypes with Chordio.

## Getting Started

1. **Use this template** — Click "Use this template" on GitHub to create your own repo
2. **Clone your repo** — `git clone <your-repo-url> && cd <your-repo>`
3. **Run sync** — `npm run sync` (authenticates and downloads the latest skills)
4. **Start designing** — `npx chordio-local` and use the `/design` skill

## Syncing Skills

The sync script downloads the latest Chordio skills and configuration:

```sh
npm run sync          # Login if needed, then sync
npm run sync login    # Auth only
npm run sync sync     # Sync only (fails if not logged in)
```

Your auth token is stored at `~/.config/chordio/token.json` and lasts 30 days.
