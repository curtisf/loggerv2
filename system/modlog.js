import { getLogChannel } from '../handlers/read'
import { log } from './log'

function sendToLog (bot, obj, optGuild, optChannel) {
  if (optGuild) {
    getLogChannel(optGuild).then((channel) => {
      if (channel !== false) {
        if (optChannel) {
          if (channel.id !== optChannel) {
            channel.sendMessage('', false, obj).catch(() => {})
          }
        } else {
          channel.sendMessage('', false, obj).catch(() => {})
        }
      }
    })
  } else if (!obj.guildID) {
    log.warn('Object sent to modlog was missing Guild ID!')
  } else if (!obj.changed) {
    log.warn('Object sent to modlog was missing what changed!')
  } else if (!obj.type) {
    log.warn('Object sent to modlog was missing the type of change!')
  } else {
    let abstractEmbed = {
      'color': obj.color ? obj.color : 14774795,
      'timestamp': new Date(),
      'footer': {
        'icon_url': '',
        'text': ''
      },
      'author': {
        'name': '',
        'icon_url': ''
      },
      'fields': [
        {
          'name': `${obj.type}`,
          'value': `${obj.changed}`
        }
      ]
    }
    if (obj.from) {
      obj.from.avatar ? abstractEmbed.footer.icon_url = `https://cdn.discordapp.com/avatars/${obj.from.id}/${obj.from.avatar}.png` : abstractEmbed.author.icon_url = `https://cdn.discordapp.com/embed/avatars/${obj.from.discriminator % 5}.png?size=1024`
      abstractEmbed.footer.text = `${obj.from.username}#${obj.from.discriminator}`
    } else {
      abstractEmbed.footer.icon_url = `${bot.User.avatarURL}`
      abstractEmbed.footer.text = `${bot.User.username}#${bot.User.discriminator}`
    }
    if (obj.against) {
      abstractEmbed.author.name = `${obj.against.username}#${obj.against.discriminator}`
      obj.against.avatar ? abstractEmbed.author.icon_url = `https://cdn.discordapp.com/avatars/${obj.against.id}/${obj.against.avatar}.png` : abstractEmbed.author.icon_url = `https://cdn.discordapp.com/embed/avatars/${obj.against.discriminator % 5}.png?size=1024`
      abstractEmbed.thumbnail = {'thumbnail': {'url': `${obj.against.thumbnail}`}}
    }
    if (obj.footer) {
      abstractEmbed.footer.icon_url = `${obj.footer.icon_url}`
      abstractEmbed.footer.text = `${obj.footer.text}`
    }

    getLogChannel(obj.guildID).then((channel) => {
      if (channel !== false) {
        if (obj.channelID) {
          if (channel.id !== obj.channelID) {
            channel.sendMessage('', false, abstractEmbed).catch(() => {})
          }
        } else {
          channel.sendMessage('', false, abstractEmbed).catch(() => {})
        }
      }
    })
  }
}

export { sendToLog }
