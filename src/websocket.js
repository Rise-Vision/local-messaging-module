// Creates the remote websocket using Primus.
// This was separated to facilitate testing.

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

function configure(ms, ipc) {
  ms.on("data", data=>ipc.server.broadcast("message", data));
  ms.on("open", ()=>ipc.server.broadcast("message", {topic: "ms-connected"}));
  ms.on("close", ()=>ipc.server.broadcast("message", {topic: "ms-disconnected"}));
  ms.on("end", ()=>ipc.server.broadcast("message", {topic: "ms-disconnected"}));
  ms.on("error", (err) => {
    setTimeout(()=>{
      const details = `MS socket connection error, Primus will attempt reconnection: ${
        err ? err.message || util.inspect(err, {depth: 1}) : ""
      }`

      log.all("warning", {"event_details": details});
    }, loggerModuleDelay);
  });

  return new Promise(res=>ms.on("open", ()=>{
    log.file(null, "MS connection opened");
    setTimeout(()=>log.external("MS connection opened"), loggerModuleDelay);
    res();
  }));
}

module.exports = {createRemoteSocket, configure}
