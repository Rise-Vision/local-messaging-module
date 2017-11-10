const Primus = require("primus");
const http = require("http");
const server = http.createServer( ()=>{} );
const commonConfig = require("common-display-module");
const msEndpoint = `https://services.risevision.com/messaging/primus/`;

let ipc, ms, localWS, spark;

function destroy() {
  if (localWS) { localWS.destroy(); }
  if (ms) { ms.destroy(); }
  if (ipc) { ipc.server.stop(); }
}

function initPrimus() {
  const {displayid} = commonConfig.getDisplaySettingsSync();
  const machineId = commonConfig.getMachineId();
  const msUrl = `${msEndpoint}?displayId=${displayid}&machineId=${machineId}`;

  localWS = new Primus( server, { transformer: "websockets" } );

  localWS.on( "connection", ( spk ) => {
    spark = spk;
    spark.write("Local Messaging Connection");
  } );

  localWS.on( "destroy", () => {
    console.log('localWS instance has been destroyed');
  });

  ms = new (Primus.createSocket({
    transformer: "websockets",
    pathname: "messaging/primus/"
  }))(msUrl, {
    reconnect: {
      max: 1800000,
      min: 5000,
      retries: Infinity
    }
  });

  ms.on("data", data=>ipc.server.broadcast("message", data));
  ms.on("error", console.log.bind(console));
  return new Promise(res=>ms.on("open", ()=>{
    console.log("MS connection opened");
    res();
  }));
}

function initIPC() {
  ipc.serve( () => {
    ipc.server.on("message", (data) => {
      // data.through indicates to send data over the socket
      if (data.through === "ws"){
        if (spark) {
          spark.write(data);
        } else {
          console.log("No clients connected to WS");
        }
      } else if (data.through === "ms") {
        if (ms) {
          ms.write(data);
        } else {
          console.log("MS not connected");
        }
      } else {
        // broadcast to all client sockets
        ipc.server.broadcast(
          "message",
          data
        );
      }
    });

    ipc.server.on("socket.disconnected", (socket, destroyedSocketID) => {
      ipc.log(`client ${destroyedSocketID} has disconnected!`);
    });

  });

}

function start() {
  server.listen(8080, "localhost", () => {
    console.log("HTTP server is listening on port 8080");
  });

  server.on("error", (err) => {
    console.log(`Unable to start HTTP server running on port 8080: ${JSON.stringify(err)}`);
  });

  ipc.server.start();
}

module.exports = {
  init(_ipc) {
    ipc = _ipc;

    initIPC();
    start();
    return initPrimus();
  },
  destroy,
  getMS() {return ms;}
};
