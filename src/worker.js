import { BareClient as BareMuxClient } from "@mercuryworkshop/bare-mux";
import { BareClient } from '@tomphttp/bare-client';
import { encryptUrl, decryptUrl } from './rewrite/codecs';

self.GloomWorker = class GloomWorker {
  constructor(config = self.__gloom$config) {
    if (!config.prefix) config.prefix = "/gloom/";
    if (!config.encoding) config.encoding = "xor";
    if (!config.method) config.method = "bare-client";
    if (config.method === "bare-client") {
      if (!config.bare) config.bare = "/bare/";
      this.client = new BareClient(config.bare);
    } else {
      this.client = new BareMuxClient(); // or replace with BareMux client
    }
    this.config = config;
    this.blockList = new Set(config.blockList || []);
  }

  route({ request }) {
    return request.url.startsWith(location.origin + this.config.prefix);
  }

  async fetch({ request }) {
    const urlParam = new URLSearchParams(new URL(request.url).search);

    if (urlParam.has("url")) {
      return Response.redirect(encryptUrl(urlParam.get("url")));
    }

    try {
      const encodedUrl = request.url.split(this.config.prefix)[1];
      if (!encodedUrl) throw new Error("Invalid URL encoding");

      const url = decryptUrl(encodedUrl);

      if (this.isBlocked(url)) {
        return new Response("Forbidden", { status: 403 });
      }

      let Clientreq = new Request(fetchedURL, {
        headers: requestCtx.headers,
        method: requestCtx.method,
        body: requestCtx.body,
        credentials: requestCtx.credentials,
        mode:
            location.origin !== requestCtx.address.origin
                ? 'cors'
                : requestCtx.mode,
        cache: requestCtx.cache,
        redirect: requestCtx.redirect,
    });

    if (typeof this.config.middleware === 'function') {
        const middleware = this.config.middleware(Clientreq);

        if (middleware instanceof Response) {
            return middleware;
        } else if (middleware instanceof Request) {
            // The middleware returned a modified request.
            // You can continue processing the modified request.
            Clientreq = middleware;
        }
    }

    const response = await this.client.fetch(Clientreq, {
        headers: requestCtx.headers,
        method: requestCtx.method,
        body: requestCtx.body,
        credentials: requestCtx.credentials,
        mode:
            location.origin !== requestCtx.address.origin
                ? 'cors'
                : requestCtx.mode,
        cache: requestCtx.cache,
        redirect: requestCtx.redirect,
    });

      const responseBody = await this.processResponseBody(response, request);
      const responseHeaders = this.rewriteHeaders(response.rawHeaders, url);

      return new Response(responseBody, {
        headers: responseHeaders,
        status: response.status,
        statusText: response.statusText,
      });
    } catch (err) {
      console.error(err);
      return this.displayError(err, request.url);
    }
  }

  async processResponseBody(response, request) {
    switch (request.destination) {
      case "iframe":
      case "document":
        return this.rewriteHtml(await response.text(), new URL(request.url));
      case "script":
        return this.rewriteJs(await response.text(), new URL(request.url));
      case "style":
        return this.rewriteCss(await response.text(), new URL(request.url));
      default:
        return response.body;
    }
  }

  rewriteHeaders(headers, url) {
    // Implement your headers rewrite logic here
    return headers;
  }

  rewriteHtml(html, url) {
    // Implement your HTML rewrite logic here
    return html;
  }

  rewriteJs(js, url) {
    // Implement your JS rewrite logic here
    return js;
  }

  rewriteCss(css, url) {
    // Implement your CSS rewrite logic here
    return css;
  }

  isBlocked(url) {
    return this.blockList.has(new URL(url).hostname);
  }

  displayError(err, fetchedURL) {
    const headers = {
      "content-type": "text/html",
    };
    if (crossOriginIsolated) {
      headers["Cross-Origin-Embedder-Policy"] = "require-corp";
    }

    const trace = String(err);
    const script = `
      errorTrace.value = ${JSON.stringify(trace)};
      fetchedURL.textContent = ${JSON.stringify(fetchedURL)};
      for (const node of document.querySelectorAll("#hostname")) node.textContent = ${JSON.stringify(location.hostname)};
      reload.addEventListener("click", () => location.reload());
      version.textContent = "0.0.1";
    `;

    const errorPage = `
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="utf-8" />
      <title>Error</title>
      <style>* { background-color: white }</style>
      </head>
      <body>
      <h1 id="errorTitle">Error processing your request</h1>
      <hr />
      <p>Failed to load <b id="fetchedURL"></b></p>
      <p id="errorMessage">Internal Server Error</p>
      <textarea id="errorTrace" cols="40" rows="10" readonly></textarea>
      <p>Try:</p>
      <ul>
      <li>Checking your internet connection</li>
      <li>Verifying you entered the correct address</li>
      <li>Clearing the site data</li>
      <li>Contacting <b id="hostname"></b>'s administrator</li>
      <li>Verify the server isn't censored</li>
      </ul>
      <p>If you're the administrator of <b id="hostname"></b>, try:</p>
      <ul>
      <li>Restarting your server</li>
      <li>Updating Gloom</li>
      <li>Troubleshooting the error on the GitHub repository</li>
      </ul>
      <button id="reload">Reload</button>
      <hr />
      <p><i>Gloom v<span id="version"></span></i></p>
      <script src="${'data:application/javascript,' + encodeURIComponent(script)}"></script>
      </body>
      </html>
    `;

    return new Response(errorPage, {
      status: 500,
      headers: headers,
    });
  }
};
