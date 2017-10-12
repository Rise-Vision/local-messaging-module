const ipc = require("node-ipc"),
  localMessaging = require("./local-messaging.js");

ipc.config.id   = "ms";
ipc.config.retry = 1500;

localMessaging.init(ipc);




