type SearchItem = {
  sport: string | null;
};

type MergeSearchOptions<T extends SearchItem> = {
  curated: T[];
  sportFilter?: string;
  maxResults: number;
  getId: (item: T) => string;
  acceptApiRow?: (row: Record<string, unknown>, item: T) => boolean;
  apiRows: Array<Record<string, unknown>>;
  normalizeRow: (row: Record<string, unknown>) => T | null;
};

export function mergeCuratedAndApiSearch<T extends SearchItem>(
  opts: MergeSearchOptions<T>
): T[] {
  const seen = new Set<string>();
  const results: T[] = [];

  const push = (item: T) => {
    if (opts.sportFilter && (item.sport ?? "").toLowerCase() !== opts.sportFilter) return;
    const id = opts.getId(item);
    if (seen.has(id)) return;
    seen.add(id);
    results.push(item);
  };

  for (const hint of opts.curated) {
    push(hint);
    if (results.length >= opts.maxResults) return results;
  }

  for (const row of opts.apiRows) {
    if (!row || typeof row !== "object") continue;
    const item = opts.normalizeRow(row);
    if (!item) continue;
    if (opts.acceptApiRow && !opts.acceptApiRow(row, item)) continue;
    push(item);
    if (results.length >= opts.maxResults) break;
  }

  return results;
}
