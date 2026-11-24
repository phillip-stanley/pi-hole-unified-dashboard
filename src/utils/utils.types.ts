import { PiholeAuthService } from "./server-authentication/auth_service";

export type FetchFn = typeof fetch;
export type HostNames = Record<string, string>;
export type PiholeAuth = PiholeAuthService;
