import { PiholeAuthService } from "./auth_service";

const globalForForPihole = globalThis as unknown as {
  piholeAuth?: PiholeAuthService;
};

export const piholeAuth =
  globalForForPihole.piholeAuth ?? new PiholeAuthService({}, fetch);

globalForForPihole.piholeAuth = piholeAuth;
