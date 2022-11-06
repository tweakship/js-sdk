import { Result } from '@vladbasin/ts-result';

export type HttpRequestExecutorType = <T>(url: string, body: unknown) => Result<T>;
