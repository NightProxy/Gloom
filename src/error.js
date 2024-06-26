export function handleError(error, req, res) {
  if (!res.headersSent) {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h1>Error</h1><p>${error.message} </p>`);
  }
}
