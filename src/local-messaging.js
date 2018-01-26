const Primus = require("primus");
const http = require("http");
const server = http.createServer(()=>{});
const websocket = require("./websocket");
const commonConfig = require("common-display-module");
const config = require("./config/config");
const util = require("util");
const heartbeat = require("common-display-module/heartbeat");

const clients = new Set();
const port = 8080;
const wsClients = new Map();

let installedClients, ipc, localWS, ms;

function destroy() {
  if (localWS) {localWS.destroy();}
  if (ms) {ms.destroy();}
  if (ipc) {ipc.server.stop();}

  heartbeat.stop();
}

function initPrimus(displayId, machineId) {
  localWS = new Primus(server, {transformer: "websockets"});

  localWS.on("connection", (spark) => {
    spark.on("data", (message) => {
      // close any connection that is sending data without a from attribute
      if (!message.from) {
        spark.end();
        return;
      }

      if (message.topic) {

        if (message.topic === "client-list-request") {

          const clientListMessage = {topic: "client-list", installedClients, clients: Array.from(clients)};
          spark.write(clientListMessage);

        } else if (message.topic === "connected") {
          wsClients.set(spark.id, message.data.component_id);
          clients.add(message.data.component_id);

          const clientListMessage = {topic: "client-list", installedClients, clients: Array.from(clients), status: "connected", client: message.data.component_id};

          ipc.server.broadcast(
            "message",
            clientListMessage
          );

        } else {
          ipc.server.broadcast("message", message);
        }
      }
    });
  });

  localWS.on("destroy", () => {
    log.all("localWS instance has been destroyed");
  });

  localWS.on('disconnection', (spark) => {
    if (wsClients.has(spark.id)) {
      const componentId = wsClients.get(spark.id);
      log.file(`${componentId} has disconnected`);

      clients.delete(componentId);

      const message = {topic: "client-list", installedClients, clients: Array.from(clients), status: "disconnected", client: componentId};

      ipc.server.broadcast(
        "message",
        message
      );
    }
  });

  ms = websocket.createRemoteSocket(displayId, machineId);

  ms.on("data", data=>ipc.server.broadcast("message", data));
  ms.on("error", (err) => {
    const userFriendlyMessage = "MS socket connection error";

    log.error({
        "event_details": err ? err.message || util.inspect(err, {depth: 1}) : "",
        "version": config.getModuleVersion()
    }, userFriendlyMessage, config.bqTableName);
  });

  return new Promise(res=>ms.on("open", ()=>{
    log.file(null, "MS connection opened");
    res();
  }));
}

function initIPC() {
  ipc.serve(() => {
    ipc.server.on("message", (data) => {
      // data.through indicates to send data over the socket
      if (data.through === "ws") {
        if (localWS) {
          localWS.write(data);
        } else {
          log.file(`Unable to send data through local WS: ${JSON.stringify(data)}`, "No clients connected to WS");
        }
      } else if (data.through === "ms") {
        if (ms) {
          ms.write(data);
        } else {
          log.file(`Unable to send data through MS: ${JSON.stringify(data)}`, "MS not connected");
        }
      } else {
        // broadcast to all client sockets
        ipc.server.broadcast(
          "message",
          data
        );
      }
    });

    ipc.server.on("connected", (data) => {
      if (data && data.client) {
        clients.add(data.client);

        const message = {topic: "client-list", installedClients, clients: Array.from(clients), status: "connected", client: data.client};

        ipc.server.broadcast(
          "message",
          message
        );
        // broadcast to all components
        if (localWS) {
          localWS.write(message);
        }
      }
    });

    ipc.server.on("clientlist-request", (data, socket) => {
      const message = {topic: "client-list", installedClients, clients: Array.from(clients)};

      ipc.server.emit(
        socket,
        "message",
        message
      );
    });

    ipc.server.on("socket.disconnected", (socket, destroyedSocketID) => {
      ipc.log(`client ${destroyedSocketID} has disconnected!`);
      log.file(`${destroyedSocketID} has disconnected`);

      clients.delete(destroyedSocketID);

      const message = {topic: "client-list", installedClients, clients: Array.from(clients), status: "disconnected", client: destroyedSocketID};

      ipc.server.broadcast(
        "message",
        message
      );

      // broadcast to all components
      if (localWS) {
        localWS.write(message);
      }
    });

    heartbeat.setBroadcastAction(message => {
      ipc.server.broadcast("message", message)
    });
    heartbeat.startHearbeatInterval(config.moduleName);
  });

}

function start() {
  server.listen(port, "localhost", () => {
    log.file(null, "HTTP server is listening on port 8080");
  });

  server.on("error", (err) => {
    const userFriendlyMessage = "Unable to start HTTP server running on port 8080";
    log.file(err ? err.stack || util.inspect(err, {depth: 1}) : "", userFriendlyMessage);
  });

  ipc.server.start();
}

function configureInstalledList() {
  const manifest = commonConfig.getManifest();

  installedClients = Object.keys(manifest);
}

module.exports = {
  init(_ipc, displayId, machineId) {
    ipc = _ipc;

    configureInstalledList();
    initIPC();
    start();
    return initPrimus(displayId, machineId);
  },
  destroy,
  getMS() {return ms;},
  isInClientList(id) {
    return Array.from(clients).indexOf(id) > -1;
  }
};
