/* eslint-env mocha */
/* eslint-disable max-statements, no-magic-numbers */
const assert = require("assert")
const common = require("common-display-module")
const Primus = require("primus")
const simple = require("simple-mock")

const websocket = require("../../src/websocket")

describe("Websocket : Unit", ()=>
{

  let socketCreationOptions = null

  beforeEach(()=>
  {
    const mockSettings = {displayId: "abc"}

    simple.mock(common, "getMachineId").returnWith("abc")
    simple.mock(common, "getDisplaySettingsSync").returnWith(mockSettings)

    simple.mock(Primus, "createSocket").callFn(()=>
    {
      return function(url, options) {
        socketCreationOptions = options
      }
    })
  })

  afterEach(()=> {simple.restore()})

  it("should create websocket considering proxy", ()=>
  {
    websocket.createRemoteSocket()

    assert(socketCreationOptions)

    assert.deepEqual(socketCreationOptions.reconnect, {
      max: 1800000,
      min: 5000,
      retries: Infinity
    })
  })

})
