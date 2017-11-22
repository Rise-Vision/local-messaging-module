// Creates the remote websocket using Primus.
// This was separated to facilitate testing.

const Primus = require("primus");
const ProxyAgent = require("proxy-agent");

const commonConfig = require("common-display-module");
const msEndpoint = `https://services.risevision.com/messaging/primus/`;

function createRemoteSocket() {
  const {displayid} = commonConfig.getDisplaySettingsSync();
  const machineId = commonConfig.getMachineId();
  const msUrl = `${msEndpoint}?displayId=${displayid}&machineId=${machineId}`;

  const options = {
    reconnect: {
      max: 1800000,
      min: 5000,
      retries: Infinity
    }
  };

  const proxyUri = process.env.HTTPS_PROXY;
  if (proxyUri) {
    options.transport = {agent: new ProxyAgent(proxyUri)};
  }

  return new (Primus.createSocket({
    transformer: "websockets",
    pathname: "messaging/primus/"
  }))(msUrl, options);
}

module.exports = {createRemoteSocket}
