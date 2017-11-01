const Dash = require('rethinkdbdash')
const Config = require('../botconfig.json')
const Raven = require('raven')
Raven.config(Config.raven.url).install()
let r = new Dash({
  user: Config.database.user,
  password: Config.database.pass,
  silent: true,
  servers: [{
    host: Config.database.host,
    port: Config.database.port
  }]
})

export { r }
