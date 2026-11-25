import { FetchFn, PiholeAuth } from "../utils.types";
import { FetchOptions } from "./api_client.types";

class APIClient {
  private readonly hostnames: Record<string, string>;
  private readonly authService: PiholeAuth;
  private readonly fetchFn: FetchFn;

  constructor(
    hostnames: Record<string, string>,
    authService: PiholeAuth,
    fetchFn: FetchFn = fetch,
  ) {
    this.hostnames = hostnames;
    this.authService = authService;
    this.fetchFn = fetchFn;
  }

  /**
   * @name prepareHeaders
   * @description creates HTTP headers from provided object and adds the required
   *   SID for authentication.
   * @param hostname - string: the device hostname
   * @param headers - object: requester provided headers object
   * @return - promise: headers including SID
   **/
  private async prepareHeaders(
    hostname: string,
    headers: Record<string, string>,
  ): Promise<Record<string, string>> {
    const { sid } = await this.authService.getSession(hostname);
    return {
      "Content-Type": "application/json",
      ...headers,
      "X-FTL-SID": sid,
    };
  }

  /**
   * @name prepareQueryParams
   * @description creates a query parameter string from the provided
   *  params object.
   * @param params - object: requested query params to create the url string from
   * @return - string: the query paramters string to apprend to a url
   **/
  private prepareQueryParams(params: Record<string, string | number>): string {
    const queryParams: string[] = [];

    Object.entries(params).forEach(([key, value]) => {
      queryParams.push(`${key}=${value}`);
    });

    if (queryParams.length > 0) {
      return `?${queryParams.join("&")}`;
    }

    return "";
  }

  private prepareUrl(hostname: string, path: string): string {
    return `${this.hostnames[hostname]}${path}`;
  }

  private async prepareRequestOptions(
    method: string,
    hostname: string,
    headers: Record<string, string>,
    body: string | null | Record<string, string>,
  ): Promise<FetchOptions> {
    let fetchOptions: FetchOptions = {
      method: method,
      headers: { ...(await this.prepareHeaders(hostname, headers)) },
    };

    if (body) {
      fetchOptions = {
        ...fetchOptions,
        body: body,
      };
    }

    return fetchOptions;
  }

  private async makeApiRequest(
    url: string,
    options: FetchOptions,
  ): Promise<unknown> {
    const response = await this.fetchFn(url, {
      method: options.method,
      headers: options.headers,
      body: JSON.stringify(options.body),
    });

    if (!response.ok) {
      console.error("API Error: request failed")
      return Promise.reject<unknown>("API Error: request failed")
    }

    return await response.json();
  }

  async makeRequest(
    hostname: string,
    path: string,
    config: Record<string, string | Record<string, string>>,
  ): Promise<unknown> {
    if (!hostname || !path) {
      console.error("Error: request requires a valid hostname and path");
      return Promise.reject<unknown>("Error: request requires a valid hostname and path")
    }

    const method = config.method || "GET";
    const url = this.prepareUrl(hostname, path);
    const headers = config.headers || Object.create(null);
    const params = config.params || Object.create(null);
    const queryString: string = this.prepareQueryParams(params);
    const body = config.body || null;

    const fetchOptions: FetchOptions = await this.prepareRequestOptions(
      method as string,
      hostname,
      headers,
      body,
    );

    return this.makeApiRequest(`${url}${queryString}`, { ...fetchOptions });
  }
}

export { APIClient };
