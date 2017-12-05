/* eslint-env mocha */

global.log = global.log || {file: console.log}; // eslint-disable-line global-require
const simple = require("simple-mock");
const assert = require("assert");
const commonConfig = require("common-display-module");
const localMessaging = require("../../src/local-messaging.js");
const ipc = require("node-ipc");

describe("Local Messaging : Integration", ()=>{
  before(()=>{
    simple.mock(commonConfig, "getMachineId").returnWith("abc");
    simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({displayId: "abc"});
    ipc.config.id = "lms";
    ipc.config.retry = 1500;
    localMessaging.init(ipc, "lmm-test", "lmm-test");
  });

  after(()=>{
    localMessaging.destroy();
  });

  afterEach(()=>{
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
      ipc.config.id = "test-client";
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
                  assert.deepEqual(message, {topic: "client-list", clients: [ipc.config.id], status: "connected", client: ipc.config.id});
                  done();
                }
              );
            }
          );
        }
      );

    });

    it("should listen for 'message' event and broadcast the 'message' event", (done)=>{
      const testMessage = {from: "test-client", topic: "test-topic", data: "test-message"};

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
      ipc.config.id = "test-client";
      ipc.connectTo(
        "lms",
        () => {
          ipc.of.lms.on(
            "connect",
            () => {
              ipc.of.lms.on(
                'message',
                (message) => {
                  assert.deepEqual(message, {topic: "client-list", clients: ["test-client"]});
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
});

