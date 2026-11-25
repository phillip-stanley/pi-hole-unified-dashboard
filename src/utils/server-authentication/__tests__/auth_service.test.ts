import { describe, it, expect, beforeEach, vi } from "vitest";
import { PiholeAuthService, isExpiring } from "../auth_service";
import { FetchFn } from "../../utils.types";

describe("piholeAuth", () => {
  describe("isExpiring", () => {
    it("returns false when there is valid and not near expiry", () => {
      const mockCachedSession = {
        sid: "mock-sid",
        csrf: "mock-csrf",
        expiresAt: new Date(Date.now() + 20000 * 1000),
      };
      const currentDate = new Date(Date.now() - 20000 * 1000);
      const mockRefreshLeadTime = 60;

      expect(
        isExpiring(mockCachedSession, currentDate, mockRefreshLeadTime),
      ).toEqual(false);
    });

    it("returns true when the session expires within the lead time", () => {
      const mockRefreshLeadTime = 60;
      const mockCachedSession = {
        sid: "mock-sid",
        csrf: "mock-csrf",
        expiresAt: new Date(Date.now() + (mockRefreshLeadTime / 2) * 1000),
      };
      const currentDate = new Date(Date.now() * 1000);

      expect(
        isExpiring(mockCachedSession, currentDate, mockRefreshLeadTime),
      ).toEqual(true);
    });

    it("return true when the session has already expired", () => {
      const mockRefreshLeadTime = 60;
      const mockCachedSession = {
        sid: "mock-sid",
        csrf: "mock-csrf",
        expiresAt: new Date(Date.now() + 0 * 1000),
      };
      const currentDate = new Date(Date.now() + 120 * 1000);

      expect(
        isExpiring(mockCachedSession, currentDate, mockRefreshLeadTime),
      ).toEqual(true);
    });
  });

  describe("piholeAuth.getSession", () => {
    const hosts = { hostone: "http://hostone.test", hosttwo: "http://hosttwo.test" };
    let service: PiholeAuthService;
    let fetchStub: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      fetchStub = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          session: {
            valid: true,
            totp: true,
            sid: "test-sid",
            csrf: "test-csrf",
            validity: 1800,
            message: "password correct",
          },
          took: 1002.1,
        }),
      });

      service = new PiholeAuthService(hosts, fetchStub as FetchFn);
    });

    it.each([
      ["hostone", "hostone", 1],
      ["hostone", "hosttwo", 2],
    ])("it calls fetch the expected number of times when multiple getSession calls are made", async (
      hostnameOne,
      hostnameTwo,
      expectedNumberOfRequsets
    ) => {
      await Promise.all([
        service.getSession(hostnameOne),
        service.getSession(hostnameTwo)
      ])
      expect(fetchStub).toHaveBeenCalledTimes(expectedNumberOfRequsets)
    })

    it("does not call fetch 3 times when cache is empty and 3 calls are made to getSession", async () => {
      const noneCachedHostname = "hostone";
      await Promise.all([
        service.getSession(noneCachedHostname),
        service.getSession(noneCachedHostname),
        service.getSession(noneCachedHostname),
      ]);
      expect(fetchStub).toHaveBeenCalledTimes(1);
    })

    it("fetches a new session when none is cached", async () => {
      const noneCachedHostname = "hostone";
      const session = await service.getSession(noneCachedHostname);

      expect(fetchStub).toHaveBeenCalled();
      expect(fetchStub).toHaveBeenCalledWith(
        "http://hostone.test/api/auth",
        expect.objectContaining({ method: "POST" }),
      );

      expect(session.sid).toBe("test-sid");
      expect(session.csrf).toBe("test-csrf");
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("returns the cached session when its still valid", async () => {
      const mockHostname = "hostone";

      const session = await service.getSession(mockHostname);
      await service.getSession(mockHostname);

      expect(fetchStub).toHaveBeenCalledOnce();

      expect(session.sid).toBe("test-sid");
      expect(session.csrf).toBe("test-csrf");
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("fetches a new session when the cached session is expiring", async () => {
      fetchStub.mockResolvedValue({
        ok: true,
        json: async () => ({
          session: {
            valid: true,
            totp: true,
            sid: "test-sid",
            csrf: "test-csrf",
            validity: 0,
            message: "password correct",
          },
          took: 1002.1,
        }),
      });
      const mockHostname = "hostone";

      await service.getSession(mockHostname);
      await service.getSession(mockHostname);

      expect(fetchStub).toHaveBeenCalledTimes(2);
    });

    it("clears active request and calls refreshSession when there is a failed response", async () => {
      fetchStub.mockResolvedValue({
        ok: false,
        json: async () => ({
          session: {
            valid: true,
            totp: true,
            sid: "test-sid",
            csrf: "test-csrf",
            validity: 0,
            message: "password correct",
          },
          took: 1002.1,
        }),
      });
      const mockHostname = "hostone";

      await expect(async () => await service.getSession(mockHostname)).rejects.toThrow()
      expect(fetchStub).toHaveBeenCalledTimes(1)
    });

    it("Throws an error if the servers repsonse schema is invalid", async () => {
      fetchStub.mockResolvedValue({
        ok: true,
        json: async () => ({
          session: {
            valid: "true",
            totp: true,
            sid: "test-sid",
            csrf: "test-csrf",
            validity: 0,
            message: "password correct",
          },
          took: 1002.1,
        }),
      });
      const mockHostname = "hostone";

      await expect(async () => await service.getSession(mockHostname)).rejects.toThrow()
    })
  });
});
