import type { PoolClient } from "pg";

type PostgresExecutor = Pick<PoolClient, "query">;

export = PostgresExecutor;
