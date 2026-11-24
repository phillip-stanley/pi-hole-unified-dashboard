import { session, pihole_response } from "./auth_service.types";
import { FetchFn } from "../utils.types";
import {
  AUTH_ROUTE,
  AUTH_PASSWORD,
  AUTH_REFRESH_LEAD_TIME,
} from "./auth_service.constants";
import { piholeAuthResponseSchema } from "./auth_service.schema";

export function isExpiring(
  session: session,
  now: Date,
  leadTimeSeconds: number,
): boolean {
  return now.getTime() + leadTimeSeconds * 1000 >= session.expiresAt.getTime();
}

class PiholeAuthService {
  private readonly hostnames: Record<string, string>;
  private readonly fetchFn: FetchFn;
  private activeSessionRequest: Map<string, Promise<session>>;
  private sessions: Record<string, session>;

  constructor(hostnames: Record<string, string>, fetchFn: FetchFn) {
    this.hostnames = hostnames;
    this.fetchFn = fetchFn;
    this.sessions = {};
    this.activeSessionRequest = new Map()
  }

  /**
   * @name _transformSessionResponseData
   * @description Transform the response session from pi-hole into the
   *   appliction session structure
   * @parm data (object) containing session response data
   * @return session object
   */
  private transformSessionResponseData(data: pihole_response): session {
    return {
      sid: data.session.sid,
      csrf: data.session.csrf,
      expiresAt: new Date(Date.now() + data.session.validity * 1000),
    };
  }

  private clearStateSessionRequest(hostname: string): void {
    if (!this.activeSessionRequest.has(hostname)) {
      return
    }
    this.activeSessionRequest.delete(hostname);
  }

  /*
   * @name refreshSession
   * @description requests a new session for the selected device's auth endpoint
   *   Then caches this result before returning the transformed sesssion
   * @param hostname (string) device's hostname
   * @return Promise<session>
   */
  private async refreshSession(hostname: string): Promise<session> {
    if (!Object.hasOwn(this.hostnames, hostname)) {
      this.clearStateSessionRequest(hostname);
      console.error(`Unknow host: ${hostname}`)
      return Promise.reject<session>(Error("Server authentication error"));
    }

    const response = await this.fetchFn(
      `${this.hostnames[hostname]}${AUTH_ROUTE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: `${AUTH_PASSWORD}` }),
      },
    )

    if (!response?.ok) {
      this.clearStateSessionRequest(hostname);
      console.error(`Error: can't reach ${hostname}`)
      return Promise.reject<session>(Error("Server authentication error"))
    }

    const raw = await response.json();
    const result = piholeAuthResponseSchema.safeParse(raw);

    if (!result.success) {
      console.error("ZodError: server responsed with invalid payload");
      return Promise.reject<session>(Error("Server authentication error"))
    }

    const session = this.transformSessionResponseData(result.data);
    this.sessions[hostname] = session;

    this.clearStateSessionRequest(hostname);
    return session;
  }

  /**
   * @name getSession
   * @description Returns a valid 'sid' and 'crsf' token to the consumer
   * @param hostname - string: the device hostname
   */
  async getSession(hostname: string): Promise<session> {
    const cached = this.sessions[hostname];

    if (cached && !isExpiring(cached, new Date(), AUTH_REFRESH_LEAD_TIME)) {
      return cached;
    }

    if(this.activeSessionRequest.has(hostname)) {
      return this.activeSessionRequest.get(hostname) as Promise<session>
    }

    this.activeSessionRequest.set(hostname, this.refreshSession(hostname));
    return this.activeSessionRequest.get(hostname) as Promise<session>;
  }
}

export { PiholeAuthService };
