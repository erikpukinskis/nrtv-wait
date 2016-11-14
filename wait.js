var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-wait",
  ["browser-bridge"],
  function(collectiveBridge) {

    var generator = function() {


      // Each window and CommonJS instance has its own context.

      function WaitContext() {
        this.work = {}
        this.waiting = []
        this.timeoutIsSet = false
      }

      function tryToFinish() {
        for(key in this.work) {
          return
        }

        this.waiting.forEach(function(waiter) { waiter() })

        this.waiting = []
      }

      WaitContext.prototype.wait = function(callback) {
        if (typeof callback != "function") {
          console.log(callback)
          throw new Error(callback+" is not a callback")
        }
        this.waiting.push(callback)
        this.checkInABit()
      }

      WaitContext.prototype.checkInABit = function() {
        setTimeout(tryToFinish.bind(this))
      }

      WaitContext.prototype.start = function pause() {
          var id = this.uniqueId()
          this.work[id] = true
          return id
        }

      WaitContext.prototype.uniqueId = function uniqueId() {
        do {
          var id = "wait4"+Math.random().toString(36).split(".")[1]
        } while(this.work[id])

        return id
      }

      WaitContext.prototype.finish = function finish(id) {
          delete this.work[id]
          this.checkInABit()
        }


      // Figure out the context:

      if (typeof window == "undefined") {
        var context = new WaitContext()
      } else {
        var context = window.__nrtvWaitContext || new WaitContext()

        window.__nrtvWaitContext = context
      }


      // Build a singleton:

      var wait = context.wait.bind(context)

      wait.start = context.start.bind(context)

      wait.finish = context.finish.bind(context)

      wait.forIframe = function(frame, callback, count) {

        var context = frame.contentWindow.__nrtvWaitContext

        if (!count) {
          count = 1
        } else if (count > 1) {
          console.log("iframe:", frame)
          throw new Error("Trying to wait on an iframe but it doesn't have .contentWindow.__nrtvWaitContext")
        } else {
          count++
        }

        if (context) {
          context.wait(callback)
        } else {
          setTimeout(wait.forIframe.bind(null, frame, callback, 1))
          return
        }

      }

      return wait
    }


    // Get a singleton to export in Node:

    var nodeWait = generator()

    nodeWait.defineOn =
      function(bridge) {
        var binding = bridge.__nrtvWaitBinding

        if (!binding) {
          binding = bridge.__nrtvWaitBinding = bridge.defineSingleton("wait", generator)
        }

        return binding
      }

    return nodeWait
  }
)
