const assert = require("assert");
const common = require("common-display-module");
const HttpsProxyAgent = require("https-proxy-agent");
const Primus = require("primus");
const simple = require("simple-mock");
const fs = require("fs");

const msWebsocket = require("../../src/ms-websocket");

describe("MS Websocket : Unit", () =>
{

  const cachedLog = global.log;

  after(() => global.log = cachedLog);

  beforeEach(() => {
    const mockSettings = {displayId: "abc"};

    simple.mock(fs, "watch").callbackWith();
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
      msWebsocket.createRemoteSocket();

      assert(socketCreationOptions);

      assert.deepEqual(socketCreationOptions.reconnect, {
        max: 1800000,
        min: 5000,
        retries: Infinity
      });

      assert(!socketCreationOptions.transport);
    });

    it("should create regular websocket when empty HTTPS_PROXY variable is defined", () => {
      simple.mock(process.env, 'HTTPS_PROXY', '');

      msWebsocket.createRemoteSocket();

      assert(socketCreationOptions);

      assert.deepEqual(socketCreationOptions.reconnect, {
        max: 1800000,
        min: 5000,
        retries: Infinity
      });

      assert(!socketCreationOptions.transport);
    });

    it("should create websocket considering HTTPS_PROXY variable", () => {
      simple.mock(process.env, 'HTTPS_PROXY', 'http://localhost:9191');

      msWebsocket.createRemoteSocket();

      assert(socketCreationOptions);

      assert.deepEqual(socketCreationOptions.reconnect, {
        max: 1800000,
        min: 5000,
        retries: Infinity
      });

      assert(socketCreationOptions.transport);
      assert(socketCreationOptions.transport.agent);
      assert(socketCreationOptions.transport.agent instanceof HttpsProxyAgent);
    });

  });

  describe("configure", () => {
    beforeEach(() => {
      global.log = {
        file: simple.stub(),
        all: simple.stub(),
        external: simple.stub()
      };
    });

    it("should log a warning if there is an MS connection error", () => {
      const ms = {
        on: (event, action) => {
          switch (event) {
            case 'error': return action({message: 'connection error'});
            case 'open': return action();
            default:
          }
        }
      };

      const ipc = {server: {broadcast: simple.stub()}};

      return msWebsocket.configure(ms, ipc, action => action())
      .then(() => {
        assert.equal(ipc.server.broadcast.callCount, 1);
        assert.equal(ipc.server.broadcast.lastCall.args[0], 'message');
        assert.deepEqual(ipc.server.broadcast.lastCall.args[1], {
          topic: "ms-connected"
        });

        assert.equal(global.log.file.callCount, 1);
        assert.equal(global.log.file.lastCall.args[1], 'MS connection opened');

        assert.equal(global.log.external.callCount, 1);
        assert.equal(global.log.external.lastCall.args[0], 'MS connection opened');

        assert.equal(global.log.all.callCount, 1);
        assert.equal(global.log.all.lastCall.args[0], 'warning');
        assert.deepEqual(global.log.all.lastCall.args[1], {
          "event_details": "MS socket connection: connection error"
        });
      });
    });

    it.only("should log additional events if debug flag is set", () => {
      simple.restore(common, "getDisplaySettingsSync");
      simple.mock(common, "getDisplaySettingsSync").returnWith({debug: "true"});
      const ms = {
        on: (event, action) => {
          switch (event) {
            case 'error': return action({message: 'connection error'});
            case 'open': return action();
            case 'incoming::ping': return action();
            default:
          }
        }
      };

      const ipc = {server: {broadcast: simple.stub()}};

      return msWebsocket.configure(ms, ipc, action => action())
      .then(() => {
        assert.equal(ipc.server.broadcast.callCount, 1);
        assert.equal(ipc.server.broadcast.lastCall.args[0], 'message');
        assert.deepEqual(ipc.server.broadcast.lastCall.args[1], {
          topic: "ms-connected"
        });

        assert.equal(global.log.file.callCount, 1);
        assert.equal(global.log.file.lastCall.args[1], 'MS connection opened');

        assert.equal(global.log.external.callCount, 1);
        assert.equal(global.log.external.lastCall.args[0], 'MS connection opened');

        assert.equal(global.log.all.callCount, 2);
        assert.equal(global.log.all.lastCall.args[0], 'warning');
        assert.deepEqual(global.log.all.lastCall.args[1], {
          "event_details": "MS socket connection: incoming::ping"
        });
      });
    });
  });
});
