/* eslint-env mocha */

const simple = require("simple-mock");
const assert = require("assert");
const commonConfig = require("common-display-module");
const localMessaging = require("../../src/local-messaging.js");
const ipc = require("node-ipc");

describe("Local Messaging : Integration", ()=>{
  const baseTestClientName = "test-client";
  const testManifest = {"test-client": {"version": "2018.01"}, "test-client-2": {"version": "2018.01"}, "test-client-3": {"version": "2018.01"}};

  before(()=>{
    global.log = global.log || {file: console.log, external: console.log};
    global.log.external = global.log.external || console.log;
    simple.mock(commonConfig, "getMachineId").returnWith("abc");
    simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({displayId: "abc"});
    simple.mock(commonConfig, "getManifest").returnWith(testManifest);
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
        ms.write({
          topic: "watch",
          version: "0",
          filePath: "messaging-service-test-bucket/test-folder/test-file.txt"
        });
        return new Promise(res=>ms.on("data", data=>{
          console.log(data);
          ms.destroy();
          res();
        }));
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
});
