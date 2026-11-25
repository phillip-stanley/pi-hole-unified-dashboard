export interface FetchOptions {
  method: string;
  headers: Record<string, string>;
  body?:
    | string
    | Record<string, string | number | Record<string, string | number>>;
  params?: Record<string, string | number>;
}
