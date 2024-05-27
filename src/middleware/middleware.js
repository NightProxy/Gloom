// have as many JS files with any name and they will be injected into the proxy as long as its in the parent folder 'middleware'
module.exports = function (req, res, next) {
    console.log("this is the first set of middleware!")
    next();
  };