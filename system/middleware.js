import { bot, Redis } from '../Logger'
import { loadToRedis } from '../handlers/read'
import path from 'path'
const Config = require('../botconfig.json')
const os = require('os')
const Influx = require('influx')
let everything = [
  {
    measurement: 'bot_memory_usage_mb',
    fields: {
      memoryMb: Influx.FieldType.INTEGER
    },
    tags: [
      'host'
    ]
  },
  {
    measurement: 'bot_events_every_15_seconds',
    fields: {
      eventCount: Influx.FieldType.INTEGER
    },
    tags: [
      'host'
    ]
  },
  {
    measurement: 'bot_total_users',
    fields: {
      userCount: Influx.FieldType.INTEGER
    },
    tags: [
      'host'
    ]
  },
  {
    measurement: 'bot_uptime_seconds',
    fields: {
      uptimeSeconds: Influx.FieldType.INTEGER
    },
    tags: [
      'host'
    ]
  },
  {
    measurement: 'bot_total_guilds',
    fields: {
      guildCount: Influx.FieldType.INTEGER
    },
    tags: [
      'host'
    ]
  }
]

const allEvents = [
  'channelCreate',
  'channelUpdate',
  'channelDelete',
  'guildBanAdd',
  'guildBanRemove',
  'guildRoleCreate',
  'guildRoleDelete',
  'guildRoleUpdate',
  'guildUpdate',
  'messageDelete',
  'messageDeleteBulk',
  'messageReactionRemoveAll',
  'messageUpdate',
  'guildMemberAdd',
  'guildMemberRemove',
  'guildMemberUpdate',
  'voiceChannelLeave',
  'voiceChannelJoin',
  'voiceChannelSwitch',
  'guildEmojisUpdate' ]

allEvents.forEach((event) => {
  everything.push({
    measurement: event,
    fields: {
      count: Influx.FieldType.INTEGER
    },
    tags: [
      'host'
    ]
  })
})

const influx = new Influx.InfluxDB({
  hosts: [{
    host: 'localhost', port: '8086'
  }],
  database: 'logger',
  username: Config.influx.username,
  password: Config.influx.password,
  schema: everything
})

let eventCounts = {
  'channelCreate': 0,
  'channelUpdate': 0,
  'channelDelete': 0,
  'guildBanAdd': 0,
  'guildBanRemove': 0,
  'guildRoleCreate': 0,
  'guildRoleDelete': 0,
  'guildRoleUpdate': 0,
  'guildUpdate': 0,
  'messageDelete': 0,
  'messageDeleteBulk': 0,
  'messageReactionRemoveAll': 0,
  'messageUpdate': 0,
  'guildMemberAdd': 0,
  'guildMemberRemove': 0,
  'guildMemberUpdate': 0,
  'voiceChannelLeave': 0,
  'voiceChannelJoin': 0,
  'voiceChannelSwitch': 0,
  'guildEmojisUpdate': 0
}

const Raven = require('raven')
Raven.config(Config.raven.url).install()

const dir = require('require-all')(path.join(__dirname, '/../events'))
let total = 0

function handle (type, data, guildID, channelID) {
  if (Config.influx.use) {
    eventCounts[type]++
    total = total + 1
  }
  if (guildID && type !== 'messageCreate') {
    if (channelID) {
      Redis.existsAsync(`${guildID}:ignoredChannels`).then((exist) => {
        if (exist) {
          Redis.getAsync(`${guildID}:ignoredChannels`).then((channels) => {
            if (channels.split(',').indexOf(channelID) === -1) {
              Redis.getAsync(`${guildID}:disabledEvents`).then((dEvents) => {
                if (dEvents.split(',').indexOf(type) === -1) {
                  try {
                    Raven.context(() => {
                      dir[type].run(bot, data)
                    })
                  } catch (_) {}
                }
              })
            }
          })
        } else {
          loadToRedis(guildID)
        }
      })
    } else {
      Redis.existsAsync(`${guildID}:disabledEvents`).then((res) => {
        if (res) {
          Redis.getAsync(`${guildID}:disabledEvents`).then((dEvents) => {
            if (dEvents.split(',').indexOf(type) === -1) {
              try {
                dir[type].run(bot, data)
              } catch (e) {
                console.error(e)
              }
            }
          })
        } else {
          loadToRedis(guildID)
        }
      })
    }
  } else {
    if (Object.keys(dir).indexOf(type) !== -1) {
      try {
        dir[type].run(bot, data)
      } catch (_) {}
    }
  }
}

if (Config.influx.use) {
  setInterval(() => {
    let allToSend = [
      {
        measurement: 'bot_memory_usage_mb',
        tags: { host: os.hostname() },
        fields: { memoryMb: Math.round((process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100) }
      },
      {
        measurement: 'bot_events_every_15_seconds',
        tags: { host: os.hostname() },
        fields: { eventCount: total }
      },
      {
        measurement: 'bot_total_users',
        tags: { host: os.hostname() },
        fields: { userCount: bot.users.size }
      },
      {
        measurement: 'bot_total_guilds',
        tags: { host: os.hostname() },
        fields: { guildCount: bot.guilds.size }
      },
      {
        measurement: 'bot_uptime_seconds',
        tags: { host: os.hostname() },
        fields: { uptimeSeconds: bot.uptime }
      }
    ]
    allEvents.forEach((event) => {
      allToSend.push({
        measurement: event,
        tags: { host: os.hostname() },
        fields: { count: eventCounts[event] }
      })
      eventCounts[event] = 0
    })
    influx.writePoints(allToSend)
    total = 0
  }, 15000)
}

export { handle, influx }
