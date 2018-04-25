/* eslint-env mocha */

const assert = require("assert");
const common = require("common-display-module");
const HttpsProxyAgent = require("https-proxy-agent");
const Primus = require("primus");
const simple = require("simple-mock");

const websocket = require("../../src/websocket")

describe("Websocket : Unit", () =>
{

  beforeEach(() => {
    const mockSettings = {displayId: "abc"};

    simple.mock(common, "getMachineId").returnWith("abc");
    simple.mock(common, "getDisplaySettingsSync").returnWith(mockSettings);
  });

  afterEach(() => simple.restore());

  describe("createRemoteSocket", () => {
    let socketCreationOptions = null

    beforeEach(() => {
      simple.mock(Primus, "createSocket").callFn(() =>
      {
        return function(url, options) {
          socketCreationOptions = options;
        }
      });
    });

    afterEach(() => socketCreationOptions = null);

    it("should create regular websocket when no proxy environment is defined", () => {
      websocket.createRemoteSocket();

      assert(socketCreationOptions);

      assert.deepEqual(socketCreationOptions.reconnect, {
        max: 1800000,
        min: 5000,
        retries: Infinity
      });

      assert(!socketCreationOptions.transport);
    })

    it("should create regular websocket when empty HTTPS_PROXY variable is defined", () => {
      simple.mock(process.env, 'HTTPS_PROXY', '');

      websocket.createRemoteSocket();

      assert(socketCreationOptions);

      assert.deepEqual(socketCreationOptions.reconnect, {
        max: 1800000,
        min: 5000,
        retries: Infinity
      });

      assert(!socketCreationOptions.transport);
    })

    it("should create websocket considering HTTPS_PROXY variable", () =>
    {
      simple.mock(process.env, 'HTTPS_PROXY', 'http://localhost:9191');

      websocket.createRemoteSocket();

      assert(socketCreationOptions);

      assert.deepEqual(socketCreationOptions.reconnect, {
        max: 1800000,
        min: 5000,
        retries: Infinity
      });

      assert(socketCreationOptions.transport);
      assert(socketCreationOptions.transport.agent);
      assert(socketCreationOptions.transport.agent instanceof HttpsProxyAgent);
    })

  });

});
