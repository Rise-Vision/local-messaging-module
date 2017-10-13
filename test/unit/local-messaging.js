//const Primus = require("primus");
//const assert = require("assert");
const simple = require("simple-mock");

let localMessaging;

let mocks = {};

mocks.ipc = {
  log: simple.stub(),
  serve: simple.stub(),
  server: {
    on: simple.stub()
  }
};

describe("Local Messaging", ()=>{
  beforeEach(()=>{
    localMessaging = require("../../src/local-messaging.js");
  });

  afterEach(()=>{
    simple.restore();
  });

  describe("init", () => {
    beforeEach(()=>{
      //localMessaging.init();
    });
  });
});