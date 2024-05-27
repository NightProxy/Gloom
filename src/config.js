const config = {
    prefix: "/gloom/",
    encryption: {
        method: 'none', // or 'base64', or leave this undefined for no encryption
        key: 'gloomProxy' // only needed for XOR encryption
      }
}
module.exports = { config };