import { bot, Redis } from '../Logger'
import { log } from '../system/log'
import { r } from '../system/rethinkclient'
const Config = require('../botconfig.json')
const Raven = require('raven')
Raven.config(Config.raven.url).install()

function recoverGuild (guildID) {
  let guild = bot.guilds.find(g => g.id === guildID)
  if (guild) {
    createGuild(guild)
  } else {
    log.error(`Error while recovering a guild document for ${guildID}! Make sure I'm still in the server.`)
  }
}

function createGuild (guild) {
  r.db('Logger').table('Guilds').insert({
    'id': guild.id,
    'ignoredChannels': [],
    'disabledEvents': ['voiceChannelJoin', 'voiceChannelLeave', 'voiceChannelSwitch'],
    'logchannel': '',
    'ownerID': guild.ownerID,
    'overviewID': '',
    'logBots': false,
    'feeds': {
      'messages': {
        'channelID': ''
      },
      'mod': {
        'channelID': ''
      },
      'voice': {
        'channelID': ''
      },
      'server': {
        'channelID': ''
      },
      'joinlog': {
        'channelID': ''
      }
    }
  }).run().then((r) => {
    if (r.inserted) {
      let owner = bot.users.find(u => u.id === guild.ownerID)
      log.info(`Created a doc for guild: ${guild.name} (${guild.id}), owned by ${owner.username}#${owner.discriminator} (${owner.id}), with ${guild.members.size} members`)
      guild.getInvites().then((invites) => {
        Redis.set(`${guild.id}:invites`, `${invites.map((inv) => `${inv.code}|${inv.uses}`)}`)
      }).catch(() => {})
    } else {
      if (!r.first_error.startsWith('Duplicate')) {
        log.error(`Error while creating a guild doc for guild: ${guild.name} (${guild.id})!\nError:`)
        log.error(r)
      }
    }
  }).catch((e) => {
    if (!e.first_error.startsWith('Duplicate')) {
      log.error(e)
    }
  })
}

function createUserDocument (userID) {
  return new Promise((resolve, reject) => {
    r.db('Logger').table('Users').insert({'id': userID, 'names': []}).run().then((res) => {
      if (res.inserted) {
        resolve(true)
      } else {
        resolve(res)
      }
    })
  })
}

export { recoverGuild, createGuild, createUserDocument }
