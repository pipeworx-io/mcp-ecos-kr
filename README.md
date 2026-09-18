# mcp-ecos-kr

ECOS — Bank of Korea Economic Statistics System.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `ecos_key_indicators` | Bank of Korea headline economic indicators: M1/M2 money supply, KRW/USD + KRW/JPY exchange rates, base interest rate, CPI, PPI, GDP growth, current account balance, household debt, unemployment, housing index — 101 series total in one call. Each row: indicator name, current value, cycle date, unit. Use for "what is Korea's [exchange rate / interest rate / CPI / GDP] right now". Updates daily. |
| `ecos_search_tables` | Search Bank of Korea ECOS statistic tables — 800+ official Korean economic series across monetary policy, exchange rates, prices, balance of payments, GDP, real estate, household credit, etc. Returns stat_code + Korean name + cycle (A annual / Q quarterly / M monthly / D daily). Use as a directory before ecos_get_series. q is matched substring-wise against the Korean name; pass blank to browse top-N. |
| `ecos_series_items` | List the items (sub-series) within a Bank of Korea ECOS statistic table. Most stat_codes have multiple sub-items (e.g., the exchange-rate table has rows per currency: USD, JPY, EUR, ...). Pass the stat_code from ecos_search_tables; returns item_code, item_name, cycle, data_count, start/end period. Use to discover the exact item codes needed by ecos_get_series. |
| `ecos_get_series` | Fetch a time series from Bank of Korea ECOS. Pass stat_code + cycle (A/Q/M/D) + start/end period. Date format matches the cycle: yearly = "2024", quarterly = "2024Q3", monthly = "202403", daily = "20240315". Optionally narrow to specific item_code(s) via item1/item2/item3/item4. Returns rows with stat_name, item_name, unit, time, data_value. Use after ecos_search_tables + ecos_series_items to discover codes. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "ecos-kr": {
      "url": "https://gateway.pipeworx.io/ecos-kr/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/ecos-kr/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Ecos Kr data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/ecos_key_indicators \
  -H 'Content-Type: application/json' \
  -d '{"limit":50}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/ecos_key_indicators`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.
