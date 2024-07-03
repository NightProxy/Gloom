import express from "express";
import http from "node:http";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { createBareServer } from "@tomphttp/bare-server-node";
import createRammerhead from "rammerhead/src/server/index.js";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux";
import chalk from "chalk";
import { hostname } from "node:os";
import cors from "cors";
import path from "node:path";
import wisp from "wisp-server-node";

const PORT = process.env.PORT || 8080;

(async () => {
  var app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  const bare = createBareServer("/bare/");

  app.use(express.static(process.cwd() + "/public"));

  app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "/public/index.html"));
  });

  app.get("/search=:query", async (req, res) => {
    const { query } = req.params;

    const reply = await fetch(`http://api.duckduckgo.com/ac?q=${query}&format=json`).then((resp) => resp.json());

    res.send(reply);
  });

  const server = http.createServer((req, res) => {
    app(req, res);
  });

  server.on("listening", () => {
    const address = server.address();
    var theme = chalk.hex("#7035c4");
    var host = chalk.hex("0d52bd");
    console.log(chalk.bold(theme(` 
     ██████╗ ██╗      ██████╗  ██████╗ ███╗   ███╗
    ██╔════╝ ██║     ██╔═══██╗██╔═══██╗████╗ ████║
    ██║  ███╗██║     ██║   ██║██║   ██║██╔████╔██║
    ██║   ██║██║     ██║   ██║██║   ██║██║╚██╔╝██║
    ╚██████╔╝███████╗╚██████╔╝╚██████╔╝██║ ╚═╝ ██║
     ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝ ╚═╝     ╚═╝
                                                  `)));

    console.log(`  ${chalk.bold(host("Local System:"))}            http://${address.family === "IPv6" ? `[${address.address}]` : addr.address}${address.port === 80 ? "" : ":" + chalk.bold(address.port)}`);

    console.log(`  ${chalk.bold(host("Local System:"))}            http://localhost${address.port === 8080 ? "" : ":" + chalk.bold(address.port)}`);

    try {
      console.log(`  ${chalk.bold(host("On Your Network:"))}  http://${address.ip()}${address.port === 8080 ? "" : ":" + chalk.bold(address.port)}`);
    } catch (err) {
      // can't find LAN interface
    }

    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      console.log(`  ${chalk.bold(host("Replit:"))}           https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
    }

    if (process.env.HOSTNAME && process.env.GITPOD_WORKSPACE_CLUSTER_HOST) {
      console.log(`  ${chalk.bold(host("Gitpod:"))}           https://${PORT}-${process.env.HOSTNAME}.${process.env.GITPOD_WORKSPACE_CLUSTER_HOST}`);
    }

    if (process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) {
      console.log(`  ${chalk.bold(host("Github Codespaces:"))}           https://${process.env.CODESPACE_NAME}-${address.port === 80 ? "" : "" + address.port}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`);
    }
  });
  server.listen(PORT);

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  function shutdown() {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close();
    process.exit(0);
  }
})();
