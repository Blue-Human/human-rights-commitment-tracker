# HRCT review plugin for ChatGPT

A ChatGPT plugin that runs HRCT's periodic research review. It has two parts:

- **MCP server** (`supabase/functions/hrct-mcp`): exposes the review service as six tools.
- **Skill** (`plugin/skills/hrct-periodic-review/SKILL.md`): the analyst's instructions.

```text
ChatGPT plugin → Skill → MCP server (hrct-mcp) → review-queue → Supabase
```

The MCP server is only an adapter. Every rule (evidence must open, "implemented" needs confirmation, the confirmation code, history is never overwritten) is enforced by `review-queue`; see `docs/review-agent.md`.

## Tools

| Tool | Forwards to | Kind |
|---|---|---|
| `get_research_batch` | `GET /review-queue/batch` | read |
| `submit_reviews` | `POST /review-queue/reviews` | write |
| `get_pending_confirmations` | `GET /review-queue/confirmations` | read |
| `resolve_confirmation` | `POST /review-queue/confirmations` | write, asks for confirmation |
| `get_pending_candidates` | `GET /review-queue` | read |
| `submit_verdicts` | `POST /review-queue` | write |

## Access

MCP server URL:

```text
https://gostbdmrzchccnydftgd.supabase.co/functions/v1/hrct-mcp/<HRCT_MCP_TOKEN>/mcp
```

ChatGPT cannot send API keys or custom headers to an MCP server; it supports either no authentication or OAuth 2.1. Because this server can change the public record, it is not left open: the access token is part of the URL and requests without it get a 404. **Treat the whole URL as a password.** Anyone who has it can use the tools. To revoke access, change the `HRCT_MCP_TOKEN` function secret and update the plugin with the new URL.

Two things stay protected even if the URL leaks: the `review-queue` key never leaves the server, and confirming "implemented" still needs `REVIEW_CONFIRMATION_CODE`, which is not stored in the plugin.

OAuth 2.1 is the proper replacement for the URL token if the plugin is to be shared with more people.

## Setting it up in ChatGPT

1. In ChatGPT settings, enable Developer mode.
2. Open Plugins and add a new plugin.
3. As the MCP server URL, paste the URL above with the real token. Choose "no authentication".
4. Add the skill: the contents of `plugin/skills/hrct-periodic-review/SKILL.md`.
5. Create the plugin and install it from your personal plugins.
6. In a conversation: `@HRCT Run the periodic review for 5 recommendations`.

To decide on a proposal: `@HRCT Confirm 50.19 as implemented, code XXXX`.

## Checking the server without ChatGPT

```bash
curl -s -X POST "$MCP_URL" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

The server speaks MCP over Streamable HTTP, statelessly: `POST` with JSON-RPC, JSON responses, no sessions. Any MCP client can use it; clients that can send headers may use `Authorization: Bearer <HRCT_MCP_TOKEN>` with the URL `.../hrct-mcp/mcp`.
