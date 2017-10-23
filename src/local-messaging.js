const Primus = require("primus"),
  http = require("http"),
  server = http.createServer( ()=>{} );

let ipc, primus, spark;

function destroy() {
  if (primus) { primus.destroy(); }
  if (ipc) { ipc.server.stop(); }
}

function initPrimus() {
  primus = new Primus( server, { transformer: "websockets" } );

  primus.on( "connection", ( spk ) => {
    spark = spk;
    spark.write("Local Messaging Connection");
  } );

  primus.on( "destroy", () => {
    console.log('primus instance has been destroyed');
  });
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

    initPrimus();
    initIPC();
    start();
  },
  destroy
};
