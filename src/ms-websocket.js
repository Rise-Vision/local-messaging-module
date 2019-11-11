const Primus = require("primus");

const commonConfig = require("common-display-module");

const loggerModuleDelay = 25000;
const msEndpoint = "https://services.risevision.com/messaging/primus/";
const msStageEndpoint = "https://services-stage.risevision.com/messaging/primus/";
const util = require("util");
const fs = require("fs");

let debugFlagSet = false;

function createRemoteSocket(displayId, machineId) {
  displayId = displayId || commonConfig.getDisplaySettingsSync().displayid;
  machineId = machineId || commonConfig.getMachineId();

  const endpoint = commonConfig.isStageEnvironment() ? msStageEndpoint : msEndpoint;

  const msUrl = `${endpoint}?displayId=${displayId}&machineId=${machineId}`;

  const options = {
    pingTimeout: 45000,
    reconnect: {
      max: 600000,
      min: 5000,
      retries: Infinity
    }
  };

  const agents = commonConfig.getProxyAgents();
  const agent = agents.httpsAgent || agents.httpAgent || null;
  if (agent) {
    options.transport = {agent};
  }

  return new (Primus.createSocket({
    transformer: "websockets",
    pathname: "messaging/primus/"
  }))(msUrl, options);
}

function broadcastMessage(ipc, topic) {
  ipc.server.broadcast("message", {topic});
}

function configure(ms, ipc, schedule = setTimeout) {
  setDebugFlag();
  fs.watch(commonConfig.getDisplaySettingsFileName(), {persistent: false}, setDebugFlag);

  ms.on("data", data => ipc.server.broadcast("message", data));
  ms.on("open", () => broadcastMessage(ipc, "ms-connected"));
  ms.on("close", () => broadcastMessage(ipc, "ms-disconnected"));
  ms.on("end", () => broadcastMessage(ipc, "ms-disconnected"));
  ms.on("error", err=>logWithDelay(schedule, err));

  ["reconnect scheduled",
    "reconnect",
    "reconnected",
    "reconnect failed",
    "reconnect timeout",
    "timeout",
    "incoming::error",
    "incoming::end",
    "outgoing::end",
    "end",
    "close",
    "destroy",
    "incoming::ping",
    "outgoing::ping",
    "incoming::pong",
    "outgoing::pong",
    "online",
    "offline"
  ].forEach(evt=>{
    ms.on(evt, ()=>debugFlagSet && logWithDelay(schedule, {message: evt}));
  });

  return new Promise(res => ms.on("open", () => {
    log.file(null, "MS connection opened");
    schedule(() => log.external("MS connection opened"), loggerModuleDelay);
    res();
  }));
}

function logWithDelay(schedule, detail) {
  schedule(() => {
    const details = `MS socket connection: ${
      detail ? detail.message || util.inspect(detail, {depth: 1}) : ""
    }`

    log.all("warning", {"event_details": details});
  }, loggerModuleDelay);
}

function setDebugFlag() {
  debugFlagSet = commonConfig.getDisplaySettingsSync().debug === "true";
}

module.exports = {createRemoteSocket, configure}
