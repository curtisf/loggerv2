const Dash = require('rethinkdbdash')
const bluebird = require('bluebird')
const redis = require('redis')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)
const Redis = redis.createClient()

let r = new Dash({
  user: 'admin',
  password: '',
  silent: true,
  servers: [{
    host: 'localhost',
    port: '28015'
  }]
})

function getGuild (guildID) {
  return new Promise((resolve, reject) => {
    r.db('Logger').table('Guilds').get(guildID).run().then((guild) => {
      if (guild) {
        resolve(guild)
      } else {
        reject('No guild') // eslint-disable-line
      }
    })
  })
}

function guildExists (guildID) {
  return new Promise((resolve, reject) => {
    r.db('Logger').table('Guilds').get(guildID).run().then((guild) => {
      if (guild) {
        resolve(true)
      } else {
        resolve(false)
      }
    })
  })
}

function updateGuild (guildID, toUpdate) {
  return new Promise((resolve, reject) => {
    r.db('Logger').table('Guilds').get(guildID).update(toUpdate).run().then((res) => {
      if (res.updated || res.inserted || res.replaced || res.skipped || res.unchanged) {
        resolve(true)
        loadToRedis(guildID)
      } else {
        reject(res)
      }
    })
  })
}

function loadToRedis (guildID) {
  r.db('Logger').table('Guilds').get(guildID).run().then((doc) => {
    if (doc) {
      Redis.set(`${guildID}:ignoredChannels`, doc.ignoredChannels.toString())
      Redis.set(`${guildID}:disabledEvents`, doc.disabledEvents.toString())
      Redis.del(`${guildID}:logchannel`)
      Redis.set(`${guildID}:logchannel`, doc.logchannel.toString()) // no need to expire.
    }
  })
}

exports.updateGuild = updateGuild
exports.guildExists = guildExists
exports.getGuild = getGuild
