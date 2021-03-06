import cloudFlareEdgeProxy from "../src";

const makeServiceWorkerEnv = require("service-worker-mock");
const makeFetchMock = require("service-worker-mock/fetch");

describe("Canary Releasing", () => {
    beforeEach(() => {
        Object.assign(global, makeServiceWorkerEnv(), makeFetchMock());
        jest.resetModules();
    });

    it("should equally (approximately) balance assignment", async () => {
        // set up config
        const proxy = cloudFlareEdgeProxy({
            canary: true,
            weight: 50,
            canaryBackend: "https://canary-backend.com",
            defaultBackend: "https://default-backend.com",
            salt: "canary-abc-123"
        });

        const headers = new Headers({});
        headers.append("Content-Type", "text/html");

        global.fetch = jest.fn(e => {
            return Promise.resolve({
                body: {
                    parts: [
                        e.url === "https://canary-backend.com/test"
                            ? "default"
                            : e.url === "https://default-backend.com/test"
                                ? "canary"
                                : null
                    ]
                }
            });
        });

        addEventListener("fetch", event => {
            event.respondWith(proxy(event));
        });

        const request = new Request("/test");

        await Promise.all(
            Array.apply(null, { length: 10000 }).map(() => {
                return self.trigger("fetch", request);
            })
        ).then(data => {
            const responses = data.map(item => item.body.parts[0]);
            expect(
                Math.round(
                    responses.filter(x => x === "default").length / 1000,
                    0
                )
            ).toBe(5);
            expect(
                Math.round(
                    responses.filter(x => x === "canary").length / 1000,
                    0
                )
            ).toBe(5);
        });
    });

    it("should set cookie if config.setCookie === true", async () => {
        // set up config
        const proxy = cloudFlareEdgeProxy({
            canary: true,
            weight: 50,
            canaryBackend: "https://canary-backend.com",
            defaultBackend: "https://default-backend.com",
            salt: "canary-abc-123",
            setCookie: true
        });

        const headers = new Headers({});
        headers.append("Content-Type", "text/html");

        var _vq;
        global.fetch = jest.fn(e => {
            _vq = e.headers._map.get("request-id");
            return Promise.resolve({
                body: "Backend",
                headers,
                status: 200,
                statusText: "OK"
            });
        });

        addEventListener("fetch", event => {
            event.respondWith(proxy(event));
        });

        const request = new Request(`/test`);
        const result = await self.trigger("fetch", request);

        expect([...result.headers._map]).toEqual([
            ["Content-Type", "text/html"],
            ["Set-Cookie", `_vq=${_vq}; Max-Age=31536000; HttpOnly`]
        ]);
    });

    it("should NOT set cookie if config.setCookie is not set", async () => {
        // set up config
        const proxy = cloudFlareEdgeProxy({
            canary: true,
            weight: 50,
            canaryBackend: "https://canary-backend.com",
            defaultBackend: "https://default-backend.com",
            salt: "canary-abc-123"
            //setCookie: true
        });

        const headers = new Headers({});
        headers.append("Content-Type", "text/html");

        var _vq;
        global.fetch = jest.fn(e => {
            _vq = e.headers._map.get("request-id");
            return Promise.resolve({
                body: "Backend",
                headers,
                status: 200,
                statusText: "OK"
            });
        });

        addEventListener("fetch", event => {
            event.respondWith(proxy(event));
        });

        const request = new Request(`/test`);
        const result = await self.trigger("fetch", request);

        expect([...result.headers._map]).toEqual([
            ["Content-Type", "text/html"]
        ]);
    });
});
