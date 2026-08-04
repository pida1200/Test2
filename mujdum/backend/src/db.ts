import pg from "pg";

// bigserial / int8 jinak vrací string — FE a PATCH očekávají number
pg.types.setTypeParser(20, (val) => Number.parseInt(val, 10));

export type DbQueryResultRow = Record<string, unknown>;

export interface Db {
  query<Row extends DbQueryResultRow = DbQueryResultRow>(
    text: string,
    params?: readonly unknown[]
  ): Promise<{ rows: Row[] }>;
}

export function createDbPool(databaseUrl: string): Db {
  return new pg.Pool({
    connectionString: databaseUrl
  });
}

