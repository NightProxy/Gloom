function handleError(error, req, res) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
  
  module.exports = {
    handleError,
  };