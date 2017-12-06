const config = require("./config/config");
const ipc = require("node-ipc");

let displaySettings = {};

function validateMessage(message, detail) {
  let error = "";

  if (!message) {
    error = "Message is required";
  } else if (!message.data.data.event) {
    error = "BQ event is required";
  } else if (!Object.keys(detail).length) {
    /* Checks detail separately since its value combined
    with another object that specifies the event */
    error = "BQ detail is required";
  }

  return error;
}

module.exports = {
    log(evt, detail, table, moduleName) {
      const displayId = displaySettings.displayid || displaySettings.tempdisplayid || config.getDisplayId() || detail.display_id;
      const moduleVersion = config.getModuleVersion() || detail.version || "";

      if (!displayId) {
        throw new Error("Display ID not provided");
      }

      const dataObject = Object.assign({"event": evt, "event_details": detail, "display_id": displayId, "version": moduleVersion}, detail);

      const message = {
        "topic": "log",
        "from": moduleName || config.moduleName,
        "data": {
          "projectName": config.bqProjectName,
          "datasetName": config.bqDatasetName,
          "failedEntryFile": config.bqFailedEntryFile,
          "table": table || config.bqTableName,
          "data": dataObject
        }
      };

      const messageError = validateMessage(message, detail);
      if (!messageError) {
        ipc.server.broadcast("message", message);
      } else {
        console.log(`external-logger error - ${config.moduleName}: ${messageError}`);
      }
    },
    setDisplaySettings(settings) {
      displaySettings = settings;
    }
};
