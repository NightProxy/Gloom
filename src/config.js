export const config = {
    prefix: "/gloom/",
    encryption: {
        method: 'xor', // or 'base64', or leave this undefined for no encryption
        key: 'gloomProxy' // only needed for XOR encryption
      }
}