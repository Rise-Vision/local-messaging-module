/* eslint-env mocha */

global.log = global.log || {file: ()=>{}, debug: ()=>{}, all: ()=>{}}; // eslint-disable-line global-require

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
      mock(log, 'file');
    });

    afterEach(()=>{
      simpleMock.restore();
    });

    it("should not send message to LM and log error if message.data.event is null", ()=>{
      externalLogger.log("", {"detail": "testDetail"});
      console.log(log.file.lastCall.args[0]);
      assert.deepEqual(log.file.lastCall.args[0], "external-logger error: BQ event is required");
    });
  });

   describe("External Logging", ()=>{
    before(()=>{
      ipc.config.id = "lms";
      ipc.config.retry = 1500;
      localMessaging.init(ipc, "lmn-test", "lmn-test");
    });

    beforeEach(()=>{
      mock(log, "debug");
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

      mock(localMessaging, "isInClientList").returnWith(true);

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

    it("should log console message if logging module is not connected", (done)=>{
      const expectedMessage = {
        topic: 'log',
        from: 'testFrom',
        data: {
          'projectName': 'client-side-events',
          'datasetName': 'Module_Events',
          'failedEntryFile': 'local-messaging-failed.log',
          'table': 'testTable',
          'data': {
            'event': 'testEvent',
            'event_details': 'test-details',
            'display_id': 'lmn-test',
            'version': ''
          }
        }
      };

      const expectedErrorLog = `logging module not connected, could not log:\n${JSON.stringify(expectedMessage)}`;
      ipc.connectTo(
        'lms',
        () => {
          ipc.of.lms.on(
            'connect',
            () => {
              externalLogger.log("testEvent", {"event_details": "test-details"}, "testTable", "testFrom")
              assert.deepEqual(log.debug.lastCall.args[0], expectedErrorLog);
              done();
            }
          )
        }
      );
    });

  });
});
