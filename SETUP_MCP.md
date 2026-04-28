# Claude Code MCP setup — Netlify

This file documents how to wire the Netlify MCP server into a Claude
Code session for this repo. **The PAT lives in your environment, not
in the repo.** `.mcp.json` references it via `${NETLIFY_PAT}` so the
secret never gets committed.

## One-time setup

1. **Mint a Netlify Personal Access Token.**
   Go to https://app.netlify.com/user/applications/personal-access-tokens.
   Click **New access token**. Name: `Claude Code MCP`. Expiry:
   whatever you prefer (90 days is reasonable; "No expiry" is convenient
   but riskier). Click **Generate**. **Copy the token immediately** —
   Netlify only shows it once.

2. **Set the `NETLIFY_PAT` environment variable in your Claude Code
   environment.** This is where it gets fiddly because the right
   mechanism depends on which Claude Code surface you're running:

   - **Claude Code CLI (laptop):** add to your shell rc file:
     ```bash
     export NETLIFY_PAT="nfp_xxxxxxxxxxxx"
     ```
     Then restart your shell + Claude Code session.

   - **Claude Code on the web (claude.ai/code):** Settings →
     Environment → Environment variables. Add `NETLIFY_PAT` with the
     token as the value. Save and restart the session.

   - **Claude Code Mac desktop app:** check Settings → Environment
     (path may differ between versions). Same pattern: add
     `NETLIFY_PAT`, restart.

   - **If your Claude Code surface has no env-var UI:** fall back to
     the local-override file (see below).

3. **Verify the MCP server is loaded.** In a fresh Claude Code
   session, run `/mcp` (or `/mcp list`). You should see `netlify`
   listed as available. Or just ask Claude "do you see Netlify in your
   tool registry?" — Claude can introspect.

## Fallback: local-override file (NOT committed)

If your Claude Code surface doesn't expose env vars, you can put the
token directly into a local-only file. **This file is gitignored —
never commit it.**

Create `/home/user/Japan-itinerary/.mcp.local.json` with the literal
token inlined:

```json
{
  "mcpServers": {
    "netlify": {
      "type": "http",
      "url": "https://mcp.netlify.com/v1",
      "headers": {
        "Authorization": "Bearer nfp_xxxxxxxxxxxx"
      }
    }
  }
}
```

Whether Claude Code merges `.mcp.json` and `.mcp.local.json`
automatically depends on the surface — some do, some don't. If
yours doesn't, temporarily replace `.mcp.json` with this content
(but **do not commit the change**). The `.gitignore` already excludes
`.mcp.local.json`, `.env`, and `.env.local` for exactly this reason.

## Rotation

If you ever need to revoke the token (e.g. you suspect it's leaked):

1. Netlify dashboard → User settings → Applications → Personal access
   tokens → find the token → **Revoke**.
2. Mint a new one.
3. Update `NETLIFY_PAT` in your environment (or `.mcp.local.json`).
4. Restart Claude Code session.

## What the Netlify MCP unlocks

Once wired, Claude Code can:
- Trigger deploys + tail build logs without you copy-pasting from
  the Netlify dashboard.
- Read/write env vars (e.g. rotate `GOOGLE_MAPS_API_KEY` end-to-end:
  set new env var → trigger redeploy → verify build succeeded).
- List deploy history + diff what changed between deploys.
- Manage form submissions (relevant if you ever add Netlify Forms).

## Future MCP additions

Same pattern works for other MCP servers (Google Workspace, etc.).
Add a new `mcpServers.<name>` entry to `.mcp.json` referencing
`${ENV_VAR_NAME}` for whatever auth credential it needs, then set
that env var in your environment. Document each addition in this
file.
