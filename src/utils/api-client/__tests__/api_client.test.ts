import { describe, it, expect, beforeEach, vi } from "vitest";
import { APIClient } from "../api_client";
import { FetchFn } from "../../utils.types";

describe("APIClient consumer requests", () => {
  const hosts = { hostone: "http://hostone.test" };
  let fetchStub: ReturnType<typeof vi.fn>;
  let getSession: ReturnType<typeof vi.fn>;
  let authStub: { getSession: typeof getSession };
  let client: APIClient;

  beforeEach(() => {
    getSession = vi.fn().mockResolvedValue({
      sid: "test-sid",
      csrf: "test-crsf",
      expiresAt: new Date(Date.now() + 1800 * 1000),
    });

    authStub = { getSession };

    fetchStub = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {},
      }),
    });

    client = new APIClient(hosts, authStub as any, fetchStub as FetchFn);
  });

  it("throws an error if a `path` is not provided to `makeRequest`", async () => {
    const hostname = "hostone";
    const path = null;
    const config = {};

    await expect(
      async () => await client.makeRequest(hostname, path, config),
    ).rejects.toThrow("Error: request requires a valid hostname and path");
  });

  it("throws an error if a `hostname` is not provided to `makeRequest`", async () => {
    const hostname = null;
    const path = "/network/stats";
    const config = {};

    await expect(
      async () => await client.makeRequest(hostname, path, config),
    ).rejects.toThrow("Error: request requires a valid hostname and path");
  });

  it("makes a network request with the expected query parameters sent to `makeRequest`", async () => {
    const hostname = "hostone";
    const path = "/network/stats";
    const config = {
      params: {
        name: "john",
        region: "England",
      },
    };

    const expectedUrl = `${hosts.hostone}/network/stats?name=john&region=England`;
    const expectedHeaders = {
      "Content-Type": "application/json",
      "X-FTL-SID": "test-sid",
    };

    await client.makeRequest(hostname, path, config);
    expect(fetchStub).toHaveBeenCalledWith(expectedUrl, {
      headers: expectedHeaders,
      method: "GET",
    });
  });

  it("makes a network request with the correct headers", async () => {
    const hostname = "hostone";
    const path = "/network/stats";
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const expectedHeaders = {
      "Content-Type": "application/json",
      "X-FTL-SID": "test-sid",
    };

    await client.makeRequest(hostname, path, config);
    expect(fetchStub).toHaveBeenCalledWith(`${hosts.hostone}${path}`, {
      headers: { ...expectedHeaders },
      method: "GET",
    });
  });

  it("makes a POST request with the expected body attribute", async () => {
    const hostname = "hostone";
    const path = "/network/stats";
    const config = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        paramOne: "test-param-one",
        paramTwo: "test-param-two",
      },
    };

    const expectedHeaders = {
      "Content-Type": "application/json",
      "X-FTL-SID": "test-sid",
    };

    const expectedBody = JSON.stringify(config.body);

    await client.makeRequest(hostname, path, config);

    expect(fetchStub).toHaveBeenCalledWith(`${hosts.hostone}${path}`, {
      headers: { ...expectedHeaders },
      method: "POST",
      body: expectedBody,
    });
  });
});

describe("APIClient external requests", () => {
  const hosts = { hostone: "http://hostone.test" };
  let fetchStub: ReturnType<typeof vi.fn> = vi.fn();
  let getSession: ReturnType<typeof vi.fn> = vi.fn();
  let authStub: { getSession: typeof getSession };
  let client: APIClient;

  beforeEach(() => {
    getSession = vi.fn().mockResolvedValue({
      sid: "test-sid",
      csrf: "test-crsf",
      expiresAt: new Date(Date.now() + 1800 * 1000),
    });

    authStub = { getSession };

    fetchStub = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {},
      }),
    });

    client = new APIClient(hosts, authStub as any, fetchStub as FetchFn);
  });

  it("Calls the Auth services' `getSession` method when making a request", async () => {
    const hostname = "hostone";
    const path = "/network/stats";
    const config = {};

    await client.makeRequest(hostname, path, config);
    expect(authStub.getSession).toHaveBeenCalledTimes(1);
  });
});
