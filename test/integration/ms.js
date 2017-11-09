global.log = global.log || {file:console.log};
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const localMessaging = require("../../src/local-messaging.js");

describe("Local Messaging : Integration", ()=>{
  before(()=>{
    simple.mock(commonConfig, "getMachineId").returnWith("abc");
    simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({displayId: "abc"});
    require("../../src/index.js");
  });

  after(()=>{
    localMessaging.destroy();
  });

  afterEach(()=>{
    simple.restore();
  });

  describe("Messaging service", () => {
    it("has read/write connection to MS", ()=>{
      const ms = localMessaging.getMS();

      return new Promise(res=>ms.on("open", res))
      .then(()=>{
        ms.write({topic: "watch"});
        return new Promise(res=>ms.on("data", data=>{console.log(data);res();}));
      });
    });
  });
});

