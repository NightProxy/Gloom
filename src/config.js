export const config = {
    prefix: "/gloom/",
    encryption: {
        method: 'xor'
      },
    proxy: {
      method: 'fetch',
      bare: "", //possibly going to make it so it can run off of bare servers.
      proxyServer: {
        ip: "",
        port: "" // this is for a method i want to add that routes the user through an http proxy server and posts it to the client.
      }
    }
}