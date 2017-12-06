const ipc = require("node-ipc");
const localMessaging = require("./local-messaging");
const commonConfig = require("common-display-module");
const config = require("./config/config");
const externalLogger = require("./external-logger");
const modulePath = commonConfig.getModulePath(config.moduleName);
const preventBQLog = process.env.RISE_PREVENT_BQ_LOG;

global.log = require("rise-common-electron").logger(preventBQLog ? null : externalLogger, modulePath, config.moduleName);

commonConfig.getDisplayId()
    .then(displayId=>{
      config.setDisplayId(displayId);
      config.setModuleVersion(commonConfig.getModuleVersion(config.moduleName));

      log.setDisplaySettings({displayid: displayId});
    })
    .catch(error =>console.log(`${config.moduleName} error: ${error}`));

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
