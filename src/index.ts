interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * ECOS — Bank of Korea Economic Statistics System.
 *
 * Free public API at ecos.bok.or.kr/api. The "sample" demo key works
 * for evaluation traffic with limited rate; production agents should
 * bring their own key (free signup at ecos.bok.or.kr/api/forms/svc.do).
 *
 * What you get:
 *   - 101 curated headline indicators (M1/M2, KRW/USD, KRW/JPY, base
 *     rate, CPI, GDP, etc.) via ecos_key_indicators — zero-arg call.
 *   - 800+ statistic series (monetary policy, prices, balance of
 *     payments, GDP, household debt, real estate, etc.) via the
 *     table/items/series catalogue tools.
 *
 * Same niche as FRED (US) and energy-charts (EU electricity) — fills
 * the Korean equity/macro data gap in Pipeworx (per 2026-06-03 mcp.so
 * submission flagging Korean lookups as an active builder area).
 *
 * URL shape:
 *   GET https://ecos.bok.or.kr/api/<service>/<auth_key>/<format>/<lang>/<start>/<end>/<args...>
 * Service is part of the path, args are part of the path. No query string.
 */


const BASE_URL = 'https://ecos.bok.or.kr/api';
const DEMO_KEY = 'sample';
const UA = 'pipeworx-mcp-ecos-kr/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'ecos_key_indicators',
    description:
      'Bank of Korea headline economic indicators: M1/M2 money supply, KRW/USD + KRW/JPY exchange rates, base interest rate, CPI, PPI, GDP growth, current account balance, household debt, unemployment, housing index — 101 series total in one call. Each row: indicator name, current value, cycle date, unit. Use for "what is Korea\'s [exchange rate / interest rate / CPI / GDP] right now". Updates daily.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max indicators to return (default 50, max 100).' },
      },
    },
  },
  {
    name: 'ecos_search_tables',
    description:
      'Search Bank of Korea ECOS statistic tables — 800+ official Korean economic series across monetary policy, exchange rates, prices, balance of payments, GDP, real estate, household credit, etc. Returns stat_code + Korean name + cycle (A annual / Q quarterly / M monthly / D daily). Use as a directory before ecos_get_series. q is matched substring-wise against the Korean name; pass blank to browse top-N.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        q: { type: 'string', description: 'Korean substring to match against stat names. Empty = browse top-N.' },
        limit: { type: 'number', description: 'Max rows to return (default 30, max 100).' },
      },
    },
  },
  {
    name: 'ecos_series_items',
    description:
      'List the items (sub-series) within a Bank of Korea ECOS statistic table. Most stat_codes have multiple sub-items (e.g., the exchange-rate table has rows per currency: USD, JPY, EUR, ...). Pass the stat_code from ecos_search_tables; returns item_code, item_name, cycle, data_count, start/end period. Use to discover the exact item codes needed by ecos_get_series.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        stat_code: { type: 'string', description: 'Statistic table code from ecos_search_tables (e.g., "731Y001" for exchange rates).' },
        limit: { type: 'number', description: 'Max items to return (default 30, max 100).' },
      },
      required: ['stat_code'],
    },
  },
  {
    name: 'ecos_get_series',
    description:
      'Fetch a time series from Bank of Korea ECOS. Pass stat_code + cycle (A/Q/M/D) + start/end period. Date format matches the cycle: yearly = "2024", quarterly = "2024Q3", monthly = "202403", daily = "20240315". Optionally narrow to specific item_code(s) via item1/item2/item3/item4. Returns rows with stat_name, item_name, unit, time, data_value. Use after ecos_search_tables + ecos_series_items to discover codes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        stat_code: { type: 'string', description: 'Statistic code (e.g., "901Y009" for CPI, "731Y001" for exchange rates).' },
        cycle: { type: 'string', description: 'Cycle: A (annual), Q (quarterly), M (monthly), D (daily), SM (semi-monthly).' },
        start: { type: 'string', description: 'Start period in cycle\'s native format (e.g., "2024" / "2024Q1" / "202401" / "20240101").' },
        end: { type: 'string', description: 'End period (same format as start).' },
        item1: { type: 'string', description: 'Optional item filter (e.g., "0000001" for USD in the exchange-rate table).' },
        item2: { type: 'string', description: 'Optional second item filter.' },
        item3: { type: 'string', description: 'Optional third item filter.' },
        item4: { type: 'string', description: 'Optional fourth item filter.' },
        limit: { type: 'number', description: 'Max rows to return (default 100, max 1000).' },
      },
      required: ['stat_code', 'cycle', 'start', 'end'],
    },
  },
];

interface KeyStatRow {
  CLASS_NAME: string;
  KEYSTAT_NAME: string;
  DATA_VALUE: string;
  CYCLE: string;
  UNIT_NAME: string;
}

interface StatTableRow {
  P_STAT_CODE: string | null;
  STAT_CODE: string;
  STAT_NAME: string;
  CYCLE: string | null;
  SRCH_YN: string;
  ORG_NAME: string | null;
}

interface StatItemRow {
  STAT_CODE: string;
  STAT_NAME: string;
  GRP_CODE: string;
  GRP_NAME: string;
  ITEM_CODE: string;
  ITEM_NAME: string;
  P_ITEM_CODE: string | null;
  P_ITEM_NAME: string | null;
  CYCLE: string;
  START_TIME: string;
  END_TIME: string;
  DATA_CNT: number;
  UNIT_NAME: string;
  WEIGHT: string | null;
}

interface SeriesRow {
  STAT_CODE: string;
  STAT_NAME: string;
  ITEM_CODE1: string | null;
  ITEM_NAME1: string | null;
  ITEM_CODE2: string | null;
  ITEM_NAME2: string | null;
  ITEM_CODE3: string | null;
  ITEM_NAME3: string | null;
  ITEM_CODE4: string | null;
  ITEM_NAME4: string | null;
  UNIT_NAME: string;
  TIME: string;
  DATA_VALUE: string;
}

// ECOS error envelope shape: { RESULT: { CODE: "INFO-200", MESSAGE: "..." } }
// or empty list. Normalize into a thrown Error.
type EcosResponse<T, K extends string> =
  | { [P in K]: { list_total_count?: number; row?: T[] } }
  | { RESULT?: { CODE?: string; MESSAGE?: string } };

function authKey(args: Record<string, unknown>): string {
  const k = (args._apiKey as string | undefined)?.trim();
  return k && k.length > 0 ? k : DEMO_KEY;
}

// ECOS path: /{service}/{key}/{format}/{lang}/{start}/{end}/{rest...}. The free
// "sample" key (the only one obtainable without a Korean mobile number) caps each
// call at 10 rows — a larger range returns a misleading ERROR-301 ("count type
// invalid"). The cap is per-CALL count, so we page in chunks of 10 (the first
// chunk also yields list_total_count; the rest fetch in parallel) to return the
// full result with the sample key. Real keys work the same way (just more calls).
const ECOS_CHUNK = 10;

async function ecosFetchChunk<T, K extends string>(
  service: K,
  segs: string[],
): Promise<{ rows: T[]; total: number; noData: boolean }> {
  const res = await fetch(`${BASE_URL}/${service}/${segs.join('/')}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`ECOS error: HTTP ${res.status}`);
  const data = (await res.json()) as EcosResponse<T, K>;
  if ('RESULT' in data && data.RESULT) {
    const code = data.RESULT.CODE ?? '?';
    const msg = data.RESULT.MESSAGE ?? '(no message)';
    if (code === 'INFO-200') return { rows: [], total: 0, noData: true }; // valid: no (more) data
    if (code === 'INFO-100' || code === 'CODE-100') {
      throw new Error(
        `ECOS auth required (${code}): ${msg}. Free signup at https://ecos.bok.or.kr/api/forms/svc.do. ` +
        `Pass via _apiKey, or "sample" demo key works for evaluation.`,
      );
    }
    throw new Error(`ECOS error (${code}): ${msg}`);
  }
  const wrapped = (data as Record<string, { list_total_count?: number; row?: T[] }>)[service];
  return { rows: wrapped?.row ?? [], total: wrapped?.list_total_count ?? 0, noData: false };
}

async function ecosGet<T, K extends string>(
  service: K,
  pathSegments: string[],
): Promise<T[]> {
  const [key, fmt, lang, startSeg, endSeg, ...rest] = pathSegments;
  const start = Number(startSeg) || 1;
  const end = Number(endSeg) || ECOS_CHUNK;

  const chunkSegs = (s: number, e: number) => [key, fmt, lang, String(s), String(e), ...rest];

  // First chunk — also reveals the true total so we don't over-fetch.
  const first = await ecosFetchChunk<T, K>(service, chunkSegs(start, Math.min(start + ECOS_CHUNK - 1, end)));
  if (first.noData) return [];
  const out: T[] = [...first.rows];
  const trueEnd = first.total > 0 ? Math.min(end, first.total) : end;

  const tasks: Promise<{ rows: T[]; total: number; noData: boolean }>[] = [];
  for (let s = start + ECOS_CHUNK; s <= trueEnd; s += ECOS_CHUNK) {
    tasks.push(ecosFetchChunk<T, K>(service, chunkSegs(s, Math.min(s + ECOS_CHUNK - 1, trueEnd))));
  }
  for (const chunk of await Promise.all(tasks)) out.push(...chunk.rows);
  return out;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const key = authKey(args);
  const limitOf = (def: number, max: number): number => {
    const n = (args.limit as number | undefined) ?? def;
    return Math.min(Math.max(1, n), max);
  };

  switch (name) {
    case 'ecos_key_indicators': {
      // Fixed ~101-indicator list; fetch all (pagination caps at the true total).
      const limit = limitOf(110, 200);
      const rows = await ecosGet<KeyStatRow, 'KeyStatisticList'>('KeyStatisticList', [key, 'json', 'kr', '1', String(limit)]);
      return {
        count: rows.length,
        indicators: rows.map((r) => ({
          category: r.CLASS_NAME,
          name: r.KEYSTAT_NAME,
          value: r.DATA_VALUE,
          unit: r.UNIT_NAME,
          cycle: r.CYCLE,
        })),
      };
    }

    case 'ecos_search_tables': {
      const q = ((args.q as string | undefined) ?? '').trim();
      const limit = limitOf(30, 100);
      // Pull a wider window if filtering, then post-filter — ECOS doesn't
      // support server-side substring search on this endpoint.
      const fetchN = q ? 500 : limit;
      const rows = await ecosGet<StatTableRow, 'StatisticTableList'>('StatisticTableList', [key, 'json', 'kr', '1', String(fetchN)]);
      const filtered = q
        ? rows.filter((r) => (r.STAT_NAME ?? '').includes(q)).slice(0, limit)
        : rows.slice(0, limit);
      return {
        query: q || null,
        count: filtered.length,
        tables: filtered.map((r) => ({
          stat_code: r.STAT_CODE,
          parent_stat_code: r.P_STAT_CODE,
          name: r.STAT_NAME,
          cycle: r.CYCLE,
          searchable: r.SRCH_YN === 'Y',
        })),
      };
    }

    case 'ecos_series_items': {
      const stat_code = (args.stat_code as string | undefined)?.trim();
      if (!stat_code) throw new Error('Required argument "stat_code" is missing. Pass a code like "731Y001" (from ecos_search_tables).');
      const limit = limitOf(30, 100);
      const rows = await ecosGet<StatItemRow, 'StatisticItemList'>(
        'StatisticItemList',
        [key, 'json', 'kr', '1', String(limit), stat_code],
      );
      return {
        stat_code,
        count: rows.length,
        items: rows.map((r) => ({
          stat_name: r.STAT_NAME,
          group_code: r.GRP_CODE,
          group_name: r.GRP_NAME,
          item_code: r.ITEM_CODE,
          item_name: r.ITEM_NAME,
          cycle: r.CYCLE,
          start: r.START_TIME,
          end: r.END_TIME,
          data_count: r.DATA_CNT,
          unit: r.UNIT_NAME,
        })),
      };
    }

    case 'ecos_get_series': {
      const stat_code = (args.stat_code as string | undefined)?.trim();
      const cycle = (args.cycle as string | undefined)?.trim();
      const start = (args.start as string | undefined)?.trim();
      const end = (args.end as string | undefined)?.trim();
      if (!stat_code) throw new Error('Required argument "stat_code" is missing. Pass a code like "901Y009" (CPI) or "731Y001" (exchange rates) — discover via ecos_search_tables.');
      if (!cycle) throw new Error('Required argument "cycle" is missing. Pass "A" (annual), "Q" (quarterly), "M" (monthly), or "D" (daily) — match the cycle from ecos_search_tables.');
      if (!start || !end) throw new Error('Required arguments "start" and "end" are missing. Format depends on cycle: "2024" for A, "2024Q1" for Q, "202403" for M, "20240315" for D.');
      const limit = limitOf(100, 1000);
      const path = [key, 'json', 'kr', '1', String(limit), stat_code, cycle, start, end];
      const optionalItems = [args.item1, args.item2, args.item3, args.item4];
      for (const it of optionalItems) {
        if (typeof it === 'string' && it.trim()) path.push(it.trim());
      }
      const rows = await ecosGet<SeriesRow, 'StatisticSearch'>('StatisticSearch', path);
      return {
        stat_code,
        cycle,
        start,
        end,
        count: rows.length,
        series: rows.map((r) => ({
          stat_name: r.STAT_NAME,
          item_code1: r.ITEM_CODE1,
          item_name1: r.ITEM_NAME1,
          item_code2: r.ITEM_CODE2,
          item_name2: r.ITEM_NAME2,
          unit: r.UNIT_NAME,
          time: r.TIME,
          value: r.DATA_VALUE,
        })),
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
