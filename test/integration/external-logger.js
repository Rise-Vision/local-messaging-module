/* eslint-env mocha */

const assert = require("assert");
const simpleMock = require("simple-mock");
const mock = simpleMock.mock;
const externalLogger = require('../../src/external-logger');
const localMessaging = require("../../src/local-messaging.js");
const ipc = require("node-ipc");

describe("Logging Events : Integration", ()=>{
  describe("Initialization", ()=>{
    it("should create an instance of external-logger", ()=>{
      assert(externalLogger.hasOwnProperty("log"));
      assert(externalLogger.hasOwnProperty("setDisplaySettings"));
    });
  });

  describe("Message configuration for broadcasting to Logging Module", ()=>{
    beforeEach(()=>{
      externalLogger.setDisplaySettings({displayid: "lmn-test"});
      mock(console, 'log');
    });

    afterEach(()=>{
      simpleMock.restore();
    });

    it("should not send message to LM and log error if message.data.event is null", ()=>{
      externalLogger.log("", {"detail": "testDetail"});
      assert.deepEqual(console.log.lastCall.args[0], "external-logger error - local-messaging: BQ event is required");
    });

    it("should not send message to LM and log error if message.data.detail is null", ()=>{
      externalLogger.log("test-event", {});
      assert.deepEqual(console.log.lastCall.args[0], "external-logger error - local-messaging: BQ detail is required");
    });
  });

  describe("External Logging", ()=>{
    before(()=>{
      ipc.config.id = "lms";
      ipc.config.retry = 1500;
      localMessaging.init(ipc, "lmn-test", "lmn-test");
    });

    after(()=>{
      localMessaging.destroy();
    });

    afterEach(()=>{
      ipc.disconnect('lms');
      simpleMock.restore();
    });

    it("should broadcast message for logging module", (done)=>{
      const expectedMessage = {
        topic: 'log',
        from: 'testFrom',
        data: {
          'projectName': 'client-side-events',
          'datasetName': 'Module_Events',
          'failedEntryFile': 'local-messaging-failed.log',
          'table': 'testTable',
          'data': {
            'display_id': 'lmn-test',
            'event': 'testEvent',
            'event_details': 'test-details',
            'version': ''
          }
        }
      };

      ipc.connectTo(
        'lms',
        () => {
          ipc.of.lms.on(
            'connect',
            () => {
              ipc.of.lms.on(
                'message',
                (message) => {
                  assert.deepEqual(message, expectedMessage);
                  done();
                }
              );
              externalLogger.log("testEvent", {"event_details": "test-details"}, "testTable", "testFrom");
            }
          );
        }
      );
    });
  });

});
