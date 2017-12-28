const ipc = require("node-ipc");
const localMessaging = require("./local-messaging");
const commonConfig = require("common-display-module");
const config = require("./config/config");
const externalLogger = require("./external-logger");
const modulePath = commonConfig.getModulePath(config.moduleName);
const preventBQLog = process.env.RISE_PREVENT_BQ_LOG;

global.log = require("rise-common-electron").logger(preventBQLog ? null : externalLogger, modulePath, config.moduleName);

ipc.config.id = "lms";
ipc.config.retry = 1500;

if (process.env.NODE_ENV !== "test") {
   start(ipc);
}

function initConfig() {
  return commonConfig.getDisplayId()
    .then(displayId=>{
      config.setDisplayId(displayId);
      config.setModuleVersion(commonConfig.getModuleVersion(config.moduleName));

      log.setDisplaySettings({displayid: displayId});
    })
    .catch(err =>{
      log.file(err ? err.stack || util.inspect(err, {depth: 1}) : "", "Error retrieving display id");
    });
}

function start(ipc, displayId, machineId) {
  return initConfig()
    .then(()=>{
      localMessaging.init(ipc, displayId, machineId)
        .then(()=>{
          log.all("started", {
            version: config.getModuleVersion()
          }, null, config.bqTableName);
        })
    });
}

function stop() {
  localMessaging.destroy();
}

module.exports = {
  start,
  stop
};
