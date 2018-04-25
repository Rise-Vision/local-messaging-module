const Primus = require("primus");

const commonConfig = require("common-display-module");

const loggerModuleDelay = 25000;
const msEndpoint = `https://services.risevision.com/messaging/primus/`;
const util = require("util");

function createRemoteSocket(displayId, machineId) {
  displayId = displayId || commonConfig.getDisplaySettingsSync().displayid;
  machineId = machineId || commonConfig.getMachineId();
  const msUrl = `${msEndpoint}?displayId=${displayId}&machineId=${machineId}`;

  const options = {
    pingTimeout: 45000,
    reconnect: {
      max: 1800000,
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
  ms.on("data", data => ipc.server.broadcast("message", data));
  ms.on("open", () => broadcastMessage(ipc, "ms-connected"));
  ms.on("close", () => broadcastMessage(ipc, "ms-disconnected"));
  ms.on("end", () => broadcastMessage(ipc, "ms-disconnected"));
  ms.on("error", (err) => {
    schedule(()=>{
      const details = `MS socket connection error, Primus will attempt reconnection: ${
        err ? err.message || util.inspect(err, {depth: 1}) : ""
      }`

      log.all("warning", {"event_details": details});
    }, loggerModuleDelay);
  });

  return new Promise(res=>ms.on("open", ()=>{
    log.file(null, "MS connection opened");
    schedule(()=>log.external("MS connection opened"), loggerModuleDelay);
    res();
  }));
}

module.exports = {createRemoteSocket, configure}
