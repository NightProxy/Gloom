self.__gloom$config = {
  prefix: "/gloom/",
  method: 'bare-client', //set to either bare-mux for wisp servers, or bare-client for bare servers
  bare: "/bare/",
  encoding: "xor",
  config: "/gloom/gloom.config.js",
  bundle: "/gloom/gloom.bundle.js",
  worker: "/gloom/gloom.worker.js",
  client: "/gloom/glooom.client.js",
  inject: () => {},
  middleware: () => {},
  block: [
  
  ]
}