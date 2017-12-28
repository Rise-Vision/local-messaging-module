const Primus = require("primus");
const http = require("http");
const server = http.createServer(()=>{});
const websocket = require("./websocket")
const config = require("./config/config");
const util = require("util");

const clients = new Set();
const port = 8080;

let ipc, localWS, ms, spark;

function destroy() {
  if (localWS) {localWS.destroy();}
  if (ms) {ms.destroy();}
  if (ipc) {ipc.server.stop();}
}

function initPrimus(displayId, machineId) {
  localWS = new Primus(server, {transformer: "websockets"});

  localWS.on("connection", (spk) => {
    spark = spk;
    spark.write("Local Messaging Connection");
  });

  localWS.on("destroy", () => {
    log.all("localWS instance has been destroyed");
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
        if (spark) {
          spark.write(data);
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

        ipc.server.broadcast(
          "message",
          {topic: "client-list", clients: Array.from(clients), status: "connected", client: data.client}
        );
      }
    });

    ipc.server.on("clientlist-request", (data, socket) => {
      ipc.server.emit(
        socket,
        "message",
        {topic: "client-list", clients: Array.from(clients)}
      );
    });

    ipc.server.on("socket.disconnected", (socket, destroyedSocketID) => {
      ipc.log(`client ${destroyedSocketID} has disconnected!`);
      log.file(`${destroyedSocketID} has disconnected`);

      clients.delete(destroyedSocketID);

      ipc.server.broadcast(
        "message",
        {topic: "client-list", clients: Array.from(clients), status: "disconnected", client: destroyedSocketID}
      );
    });

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

module.exports = {
  init(_ipc, displayId, machineId) {
    ipc = _ipc;

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
