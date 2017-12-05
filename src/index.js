const ipc = require("node-ipc");
const localMessaging = require("./local-messaging.js");

ipc.config.id = "lms";
ipc.config.retry = 1500;

if (process.env.NODE_ENV !== "test") {localMessaging.init(ipc);}

module.exports = {
  start(displayId, machineId) {
    return localMessaging.init(ipc, displayId, machineId);
  },
  stop() {
    localMessaging.destroy();
  }
};
