import { bot, Redis } from '../Logger'
import { log } from '../system/log'
import { r } from '../system/rethinkclient'

function recoverGuild (guildID) {
  let guild = bot.Guilds.get(guildID)
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
    'disabledEvents': ['VOICE_CHANNEL_JOIN', 'VOICE_CHANNEL_LEAVE'],
    'logchannel': '',
    'ownerID': guild.owner.id
  }).run().then((r) => {
    if (r.inserted) {
      log.info(`Created a doc for guild: ${guild.name} (${guild.id}), owned by ${guild.owner.username}#${guild.owner.discriminator} (${guild.owner.id}), with ${guild.members.length} members`)
      guild.getInvites().then((invites) => {
        Redis.set(`${guild.id}:invites`, `${invites.map((inv) => `${inv.code}|${inv.uses}`)}`)
      }).catch(() => {})
    } else {
      log.error(`Error while creating a guild doc for guild: ${guild.name} (${guild.id})!\nError:`)
      log.error(r)
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
