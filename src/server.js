import url from 'url';
import path from 'path';
import pkg from 'node-html-parser';
const { parse } = pkg;
import { config } from './config.js';
import { encryptUrl, decryptUrl } from './encrypt.js';
import { handleError } from './error.js';
import { rewrite } from './rewrite.js';
import fs from 'fs';
import fetch from 'node-fetch';
import contentType from 'content-type';

export async function createGloomServer(server) {
  server.on('request', async (req, res) => {
    const reqUrl = url.parse(req.url, true);
    const reqPath = reqUrl.pathname.slice(config.prefix.length);
    const decodedUrl = decodeURIComponent(reqPath);
    const proxiedUrl = decryptUrl(decodedUrl);

    if (reqUrl.pathname.startsWith(`/${config.prefix}/middleware/`)) {
      console.log(`Received request for ${req.url}`);
      console.log(`Decoded URL: ${decodedUrl}`);
      console.log(`Proxied URL: ${proxiedUrl}`);
      const middlewarePath = path.join(process.cwd(), 'src/middleware', reqUrl.pathname.slice(`/${config.prefix}/middleware/`.length));
      console.log(middlewarePath);
      fs.readFile(middlewarePath, (err, data) => {
        if (err) {
          handleError(err, req, res);
          return;
        }

        res.writeHead(200);
        res.end(data);
      });
      return;
    }

    if (reqUrl.pathname.startsWith(config.prefix)) {
      if (config.proxy.method === "fetch") {
        console.log(`Received request for ${req.url}`);

        let pathAfterPrefix;
        try {
          pathAfterPrefix = decodeURIComponent(reqUrl.pathname.slice(config.prefix.length));
        } catch (err) {
          console.error(`Failed to decode URL: ${err}`);
          handleError(err, req, res);
          return;
        }

        let proxiedUrl;
        try {
          proxiedUrl = decryptUrl(pathAfterPrefix);
        } catch (err) {
          console.error(`Failed to decrypt URL: ${err}`);
          handleError(err, req, res);
          return;
        }

        console.log(`Decoded URL: ${pathAfterPrefix}`);
        console.log(`Proxied URL: ${proxiedUrl}`);

        try {
          const asset_url = new URL(proxiedUrl);
          const asset = await fetch(asset_url);

          if (!asset.ok) {
            console.error(`Failed to fetch asset: ${asset.status} ${asset.statusText}`);
            handleError(new Error(`Failed to fetch asset: ${asset.status} ${asset.statusText}`), req, res);
            return;
          }

          const contentTypeHeader = asset.headers.get('content-type');
          const parsedContentType = contentTypeHeader ? contentType.parse(contentTypeHeader).type : '';

          res.writeHead(asset.status, {
            "Content-Type": parsedContentType,
          });

          if (parsedContentType.includes('text/html')) {
            const body = await asset.text();
            const root = parse(body);
            console.log(root);

            root.querySelectorAll('*').forEach(element => rewrite(element, proxiedUrl));

            const files = fs.readdirSync(path.join(process.cwd(), 'src/middleware'));
            const scriptTags = files.map(file => `<script src="/${config.prefix}/middleware/${file}"></script>`).join('\n');
            const bodyElement = root.querySelector('body');
            if (bodyElement) {
              bodyElement.insertAdjacentHTML('beforeend', scriptTags);
            }

            res.end(root.toString());
          } else {
            res.end(Buffer.from(await asset.arrayBuffer()));
          }
        } catch (error) {
          console.error(`Error handling request: ${error}`);
          handleError(error, req, res);
        }
      }
    }
  });

  return server;
}
