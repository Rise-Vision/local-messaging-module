/* eslint-env mocha */

global.log = global.log || {file: console.log}; // eslint-disable-line global-require
const simple = require("simple-mock");
const assert = require("assert");
const commonConfig = require("common-display-module");
const localMessaging = require("../../src/local-messaging.js");
const ipc = require("node-ipc");
const Primus = require('primus');

describe("Local Messaging : Integration", ()=>{
  const baseTestClientName = "test-client";
  const testManifest = {"test-client": {"version": "2018.01"}, "test-client-2": {"version": "2018.01"}, "test-client-3": {"version": "2018.01"}};
  let wsClient = null;
  let Socket = null;
  before(()=>{
    simple.mock(commonConfig, "getMachineId").returnWith("abc");
    simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({displayId: "abc"});
    simple.mock(commonConfig, "getManifest").returnWith(testManifest);
    ipc.config.id = "lms";
    ipc.config.retry = 1500;
    localMessaging.init(ipc, "lmm-test", "lmm-test");

    Socket = Primus.createSocket({transformer: "websockets"});
  });

  beforeEach(()=>{
    wsClient = new Socket('http://localhost:8080');
  });

  after(()=>{
    localMessaging.destroy();
  });

  afterEach(()=>{
    wsClient.end();
    ipc.disconnect('lms');
    simple.restore();
  });

  describe("Messaging service", () => {
    it("has read/write connection to MS", ()=>{
      const ms = localMessaging.getMS();

      return new Promise(res=>ms.on("open", res))
      .then(()=>{
        ms.write({topic: "watch"});
        return new Promise(res=>ms.on("data", data=>{console.log(data); res();}));
      });
    });
  });

  describe("Local Messaging IPC", () => {
    it("should listen for 'connected' event and broadcast message 'client-list' providing clients", (done)=>{
      ipc.config.id = baseTestClientName;
      ipc.connectTo(
        'lms',
        () => {
          ipc.of.lms.on(
            'connect',
            () => {
              ipc.of.lms.emit("connected", {client: ipc.config.id});

              ipc.of.lms.on(
                'message',
                (message) => {
                  assert.deepEqual(message, {topic: "client-list", installedClients: [baseTestClientName, `${baseTestClientName}-2`, `${baseTestClientName}-3`], clients: [baseTestClientName], status: "connected", client: ipc.config.id});
                  done();
                }
              );
            }
          );
        }
      );

    });

    it("should listen for 'message' event and broadcast the 'message' event", (done)=>{
      const testMessage = {from: baseTestClientName, topic: "test-topic", data: "test-message"};

      ipc.connectTo(
        'lms',
        () => {
          ipc.of.lms.on(
            'connect',
            () => {
              ipc.of.lms.on(
                'message',
                (message) => {
                  assert.deepEqual(message, testMessage);
                  done();
                }
              );

              ipc.of.lms.emit('message', testMessage);
            }
          );
        }
      );

    });

    it("should listen for 'clientlist-request' event and emit a 'message' event back with client list", (done)=>{
      ipc.config.id = baseTestClientName;
      ipc.connectTo(
        "lms",
        () => {
          ipc.of.lms.on(
            "connect",
            () => {
              ipc.of.lms.on(
                'message',
                (message) => {
                  assert.deepEqual(message, {topic: "client-list", installedClients: [baseTestClientName, `${baseTestClientName}-2`, `${baseTestClientName}-3`], clients: [baseTestClientName]});
                  done();
                }
              );

              ipc.of.lms.emit("clientlist-request");
            }
          );
        }
      );

    });
  });

  describe("Local Messaging WS", () => {
    it("should listen for 'client-list-request' message from component and broadcast the 'client-list message' event", (done)=>{
      const testMessage = {from: "twitter-component", topic: "client-list-request"};


      wsClient.on("data", (message) => {
        assert.deepEqual(message, {topic: "client-list", installedClients: [baseTestClientName, `${baseTestClientName}-2`, `${baseTestClientName}-3`], clients: [baseTestClientName]});
        done();
      });

      wsClient.write(testMessage);

    });

    it("should listen for 'connected' message from component and broadcast the 'client-list message connected' event", (done)=>{
      const testMessage = {from: "twitter-component", topic: "connected", data: {"component_id": "component1"}};

      ipc.config.id = baseTestClientName;
      ipc.connectTo(
        "lms",
        () => {
          ipc.of.lms.on(
            "connect",
            () => {
              ipc.of.lms.on(
                'message',
                (message) => {
                  assert.deepEqual(message, {topic: "client-list", installedClients: [baseTestClientName, `${baseTestClientName}-2`, `${baseTestClientName}-3`], clients: [baseTestClientName, "component1"], status: "connected", client: "component1"});
                  done();
                }
              );
            }
          );
        }
      );

      wsClient.write(testMessage);

    });

    it("should listen for 'disconnected' message from component and broadcast the 'client-list message disconnected' event", (done)=>{
      const testMessage = {from: "twitter-component", topic: "connected", data: {"component_id": "component1"}};
      let count = 0;
      ipc.config.id = baseTestClientName;
      ipc.connectTo(
        "lms",
        () => {
          ipc.of.lms.on(
            "connect",
            () => {
              ipc.of.lms.on(
                'message',
                (message) => {
                  if (!count) {
                    assert.deepEqual(message, {topic: "client-list", installedClients: [baseTestClientName, `${baseTestClientName}-2`, `${baseTestClientName}-3`], clients: [baseTestClientName, "component1"], status: "connected", client: "component1"});
                    count += 1;
                    wsClient.end();
                  } else {
                    assert.deepEqual(message, {topic: "client-list", installedClients: [baseTestClientName, `${baseTestClientName}-2`, `${baseTestClientName}-3`], clients: [baseTestClientName], status: "disconnected", client: "component1"});
                    done();
                  }
                }
              );
            }
          );
        }
      );

      wsClient.write(testMessage);
    });
  });
});
