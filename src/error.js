export function handleError(error, req, res) {
  if (!res.headersSent) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
}