/* eslint-env mocha */

const assert = require("assert");
// const config = require("../../common.js"),
// const ipc = require('node-ipc');
const simpleMock = require("simple-mock");
const mock = simpleMock.mock;
const externalLogger = require('../../src/external-logger')();

describe("Logging Events : Integration", ()=>{
  describe("Initialization", ()=>{
    it("should create an instance of external-logger", ()=>{
      assert(externalLogger.hasOwnProperty("log"));
      assert(externalLogger.hasOwnProperty("setDisplaySettings"));
    });
  });

  describe("Message configuration for broadcasting to Logging Module", ()=>{
    beforeEach(()=>{
      mock(console, 'log');

      externalLogger.setDisplaySettings({displayid: "abc123"});
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


});
