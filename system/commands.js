import { checkCanUse, checkIfAllowed } from './utils'
import { log } from './log'
import { typeName } from './determinetype'
import util from 'util'
import path from 'path'
const Config = require('../botconfig.json')
const Raven = require('raven')
Raven.config(Config.raven.url).install()

let eventsObj = require('require-all')(path.join(__dirname, '/../events'))
let events = []
Object.keys(eventsObj).map((event) => eventsObj[event]).map((event) => event.type).forEach((e) => {
  if (e) {
    events.push(e)
  }
})
let Commands = []

let notablePermissions = [
  'kickMembers',
  'banMembers',
  'administrator',
  'manageChanneks',
  'manageGuilds',
  'manageMessages',
  'manageRoles',
  'manageEmojis',
  'manageWebhooks'
]

Commands.ping = {
  name: 'ping',
  desc: 'Return pseudo-ping for the bot.',
  func: function (msg, suffix, bot) {
    msg.channel.createMessage('Pong!').then((m) => {
      m.edit(`Pong! Pseudo-ping: **${Math.floor(new Date(m.timestamp) - new Date(msg.timestamp))}** ms. Shard ping: **${bot.shards.get(0).latency}** ms.`)
    })
  }
}

Commands.info = {
  name: 'info',
  desc: 'Return information about the bot.',
  func: function (msg, suffix, bot) {
    let info = {
      'title': 'Hello there, I\'m Logger!',
      'description': 'I am a full fledged modular logging bot using audit logs curated towards those who want a bot that you set up and just let it do it\'s thing.',
      'color': 5600147,
      'timestamp': new Date(msg.timestamp),
      'footer': {
        'icon_url': `${bot.user.avatarURL}`,
        'text': `${bot.user.username}#${bot.user.discriminator}`
      },
      'thumbnail': {
        'url': `${bot.user.avatarURL}`
      },
      'fields': [{
        'name': 'General Information',
        'value': `Logger's task is to log actions from users to a specified channel. This is accomplished by using **%setchannel** in the wanted channel.`
      },
      {
        'name': 'Technical Details',
        'value': 'Logger is written in JavaScript utilizing the Node.js runtime. It uses the **eris** library to interact with the Discord API. For data storage, RethinkDB and Redis are used.'
      },
      {
        'name': 'The Authors',
        'value': 'Logger is developed and maintained by [Piero#2048](https://github.com/caf203) and [LWTech#7575](https://github.com/LWTechGaming). You can contact my maintainers via my [home server](https://discord.gg/ed7Gaa3).'
      }]
    }
    msg.channel.createMessage({embed: info})
  }
}

Commands.eval = {
  name: 'eval',
  desc: 'Good \'ol eval.',
  hidden: true,
  func: function (msg, suffix, bot) {
    let canUse = checkCanUse(msg.author.id, 'eval')
    if (canUse) {
      try {
        var returned = eval(suffix) // eslint-disable-line no-eval
        var str = util.inspect(returned, {
          depth: 1
        })
        if (str.length > 1900) {
          str = str.substr(0, 1897)
          str = str + '...'
        }
        str = str.replace(new RegExp(bot.token, 'gi'), '( ͡° ͜ʖ ͡°)') // thanks doug
        msg.channel.createMessage('```xl\n' + str + '\n```').then((ms) => {
          if (returned !== undefined && returned !== null && typeof returned.then === 'function') {
            returned.then(() => {
              var str = util.inspect(returned, {
                depth: 1
              })
              if (str.length > 1900) {
                str = str.substr(0, 1897)
                str = str + '...'
              }
              ms.edit('```xl\n' + str + '\n```')
            }, (e) => {
              var str = util.inspect(e, {
                depth: 1
              })
              if (str.length > 1900) {
                str = str.substr(0, 1897)
                str = str + '...'
              }
              ms.edit('```xl\n' + str + '\n```')
            })
          }
        })
      } catch (e) {
        msg.channel.createMessage('```xl\n' + e + '\n```')
      }
    }
  }
}

Commands.setchannel = {
  name: 'setchannel',
  desc: 'Use in the channel you want me to log to.',
  func: function (msg, suffix, bot) {
    let allowed = checkIfAllowed(msg)
    let botPerms = msg.channel.guild.members.get(bot.user.id).permission.json
    let loadToRedis = require('../handlers/read').loadToRedis
    if (botPerms.sendMessages) {
      if (allowed) {
        if (suffix) {
          msg.channel.createMessage(`<@${msg.author.id}>, Please use this in the channel that you want me to log to.`)
        } else {
          require('../handlers/update').updateGuildDocument(msg.channel.guild.id, { // to avoid globally requiring db handler functions
            'logchannel': msg.channel.id
          }).then((r) => {
            if (r === true) {
              msg.channel.createMessage(`<@${msg.author.id}>, I will now log actions to **${msg.channel.name}**!`)
              loadToRedis(msg.channel.guild.id)
            } else {
              msg.channel.createMessage(`<@${msg.author.id}>, An error has occurred while setting the log channel, please try again.`)
              log.error(`Error while setting channel for guild ${msg.channel.guild.name} (${msg.channel.guild.id}).`)
              log.error(r)
            }
          })
        }
      } else {
        msg.channel.createMessage(`<@${msg.author.id}>, You can't use this command! Required: **Manage Server** or **Administrator**`)
      }
    } else {
      msg.author.getDMChannel().then((DMChannel) => {
        DMChannel.createMessage(`I can't send messages to **${msg.channel.name}**!`)
      }).catch(() => {}) // if you have dms disabled and the bot can't send messages to the log channel, sucks for you.
    }
  }
}

Commands.clearchannel = {
  name: 'clearchannel',
  desc: 'Use this to clear the logchannel associated with the server.',
  func: function (msg, suffix, bot) {
    let allowed = checkIfAllowed(msg)
    let loadToRedis = require('../handlers/read').loadToRedis
    if (allowed) {
      require('../handlers/update').updateGuildDocument(msg.channel.guild.id, { // to avoid globally requiring db handler functions
        'logchannel': ''
      }).then((r) => {
        if (r === true) {
          msg.channel.createMessage(`<@${msg.author.id}>, Log channel wiped!`)
          loadToRedis(msg.guild.id)
        } else {
          msg.channel.createMessage(`<@${msg.author.id}>, An error has occurred while clearing the log channel, please try again.`)
          log.error(`Error while clearing channel for guild ${msg.channel.guild.name} (${msg.channel.guild.id}).`)
          log.error(r)
        }
      })
    } else {
      msg.channel.createMessage(`<@${msg.author.id}>, You can't use this command! Required: **Manage Server** or **Administrator**`)
    }
  }
}

Commands.recache = {
  name: 'recache',
  desc: 'Use this to recache the guild in Redis',
  hidden: true,
  func: function (msg, suffix, bot) {
    let loadToRedis = require('../handlers/read').loadToRedis
    if (checkCanUse(msg.author.id, 'eval')) {
      if (bot.guilds.find(g => g.id === suffix)) {
        try {
          loadToRedis(suffix)
          msg.addReaction('👌')
        } catch (e) {
          msg.channel.createMessage('Failed')
          msg.author.getDMChannel().then((c) => {
            c.createMessage(JSON.stringify(e))
          })
        }
      } else {
        msg.addReaction('❌')
      }
    }
  }
}

Commands.ignorechannel = {
  name: 'ignorechannel',
  desc: 'Use this in a channel you want to ignore.',
  func: function (msg, suffix, bot) {
    let allowed = checkIfAllowed(msg)
    let getGuildDocument = require('../handlers/read').getGuildDocument // to avoid exposing globally
    let updateGuildDocument = require('../handlers/update').updateGuildDocument
    let loadToRedis = require('../handlers/read').loadToRedis
    if (allowed) {
      getGuildDocument(msg.channel.guild.id).then((res) => {
        if (res) {
          if (res.ignoredChannels.indexOf(msg.channel.id) !== -1) {
            res.ignoredChannels.splice(res.ignoredChannels.indexOf(msg.channel.id), 1)
            updateGuildDocument(msg.channel.guild.id, {
              'ignoredChannels': res.ignoredChannels
            }).then((resp) => {
              if (resp === true) {
                msg.channel.createMessage(`<@${msg.author.id}>, I will resume logging events in **${msg.channel.name}**!`)
                loadToRedis(msg.channel.guild.id)
              } else {
                msg.channel.createMessage(`<@${msg.author.id}>, Something went wrong while trying to resume logging to **${msg.channel.name}**, please try again.`)
                log.error(`Error while removing ${msg.channel.id} from the ignored channel array, guild ID ${msg.channel.guild.id}.`)
                log.error(resp)
              }
            })
          } else {
            res.ignoredChannels.push(msg.channel.id)
            updateGuildDocument(msg.channel.guild.id, {
              'ignoredChannels': res.ignoredChannels
            }).then((resp) => {
              if (resp === true) {
                msg.channel.createMessage(`<@${msg.author.id}>, I will not log events in **${msg.channel.name}** anymore!`)
                loadToRedis(msg.channel.guild.id)
              } else {
                msg.channel.createMessage(`<@${msg.author.id}>, Something went wrong while trying to ignore **${msg.channel.name}**, please try again.`)
                log.error(`Error while adding ${msg.channel.id} from the ignored channel array, guild ID ${msg.channel.guild.id}.`)
                log.error(resp)
              }
            })
          }
        } // silently recover guild document
      })
    } else {
      msg.channel.createMessage(`<@${msg.author.id}>, You can't use this command! Required: **Manage Server** or **Administrator**`)
    }
  }
}

Commands.togglemodule = {
  name: 'togglemodule',
  desc: `Use this with a valid module name to toggle a module on or off! Valid modules are: \`\`\`xl\n${events.join(', ')}\`\`\``,
  func: function (msg, suffix, bot) {
    let allowed = checkIfAllowed(msg)
    let getGuildDocument = require('../handlers/read').getGuildDocument // to avoid exposing globally
    let updateGuildDocument = require('../handlers/update').updateGuildDocument
    let loadToRedis = require('../handlers/read').loadToRedis
    if (allowed) {
      if (suffix) {
        if (events.indexOf(suffix) !== -1) {
          getGuildDocument(msg.channel.guild.id).then((res) => {
            if (res) {
              if (res.disabledEvents.indexOf(suffix) !== -1) {
                res.disabledEvents.splice(res.disabledEvents.indexOf(suffix), 1)
                updateGuildDocument(msg.channel.guild.id, {
                  'disabledEvents': res.disabledEvents
                }).then((resp) => {
                  if (resp === true) {
                    msg.channel.createMessage(`<@${msg.author.id}>, Module **${suffix}** has been enabled.`)
                    loadToRedis(msg.channel.guild.id)
                  } else {
                    msg.channel.createMessage(`<@${msg.author.id}>, Something went wrong while trying to enable module **${suffix}**, please try again.`)
                    log.error(`Error while enabling module ${suffix}, guild ID ${msg.channel.guild.id}.`)
                    log.error(resp)
                  }
                })
              } else {
                res.disabledEvents.push(suffix)
                updateGuildDocument(msg.channel.guild.id, {
                  'disabledEvents': res.disabledEvents
                }).then((resp) => {
                  if (resp === true) {
                    msg.channel.createMessage(`<@${msg.author.id}>, Module **${suffix}** has been disabled.`)
                    loadToRedis(msg.channel.guild.id)
                  } else {
                    msg.channel.createMessage(`<@${msg.author.id}>, Something went wrong while trying to disable module **${suffix}**, please try again.`)
                    log.error(`Error while disabling module ${suffix}, guild ID ${msg.channel.guild.id}.`)
                    log.error(resp)
                  }
                })
              }
            } // silently recover guild document
          })
        } else {
          msg.channel.createMessage('Invalid module, casing is important! Try using %help')
        }
      } else {
        msg.channel.createMessage('You didn\'t provide a module name! Try using %help.')
      }
    } else {
      msg.channel.createMessage(`You can't use this command! Required: **Manage Server** or **Administrator**`)
    }
  }
}

Commands.lastnames = {
  name: 'lastnames',
  desc: 'Provide mention(s) or a userid and get lastnames of a user',
  func: function (msg, suffix, bot) {
    if (suffix) {
      if (msg.mentions.length !== 0) {
        if (msg.mentions.length > 1) {
          msg.channel.createMessage(`<@${msg.author.id}>, One at a time, please!`)
        } else {
          require('../handlers/read').getUserDocument(msg.mentions[0].id).then((doc) => {
            if (doc) {
              msg.channel.createMessage(`<@${msg.author.id}>, Previous names: \`\`\`xl\n${doc.names ? doc.names.filter((name, pos) => doc.names.indexOf(name) === pos).join(', ') : 'None'}\`\`\``)
            } else {
              msg.channel.createMessage(`<@${msg.author.id}>, I have no stored names for **${msg.mentions[0].username}**!`)
            }
          })
        }
      } else {
        let splitSuffix = suffix.split()
        let member = msg.channel.guild.members.get(splitSuffix[0])
        if (member) {
          require('../handlers/read').getUserDocument(member.id).then((doc) => {
            if (doc) {
              msg.channel.createMessage(`<@${msg.author.id}>, Previous names: \`\`\`xl\n${doc.names ? doc.names.filter((name, pos) => doc.names.indexOf(name) === pos).join(', ') : 'None'}\`\`\``)
            } else {
              msg.channel.createMessage(`<@${msg.author.id}>, I have no stored names for **${member.username}**!`)
            }
          })
        } else {
          msg.channel.createMessage(`<@${msg.author.id}>, The specified ID isn't a member of this server!`)
        }
      }
    }
  }
}

Commands.archive = {
  name: 'archive',
  desc: 'Gets the last number of messages provided from the channel it is used in. (%archive [1-400])',
  func: function (msg, suffix, bot) {
    let request = require('superagent')
    let splitSuffix = suffix.split(' ')
    if (!msg.channel.guild.members.get(msg.author.id).permission.json.readMessageHistory || !msg.channel.guild.members.get(msg.author.id).permission.json.manageMessages) {
      msg.channel.createMessage(`<@${msg.author.id}>, You lack **Read Message History** or **Manage Messages** permission!`)
    } else if (!msg.channel.guild.members.get(bot.user.id).permission.json.readMessageHistory) {
      msg.channel.createMessage(`<@${msg.author.id}>, I need the **Read Message History** permission to archive messages!`)
    } else if (!suffix) {
      msg.channel.createMessage(`<@${msg.author.id}>, You need to provide a number of messages to archive! (1-400)`)
    } else if (isNaN(splitSuffix[0])) {
      msg.channel.createMessage(`<@${msg.author.id}>, You need to provide a number of messages to archive! (1-400)`)
    } else if (splitSuffix[0] < 1 || splitSuffix[0] > 400) {
      msg.channel.createMessage(`<@${msg.author.id}>, Invalid number of messages provided, you can use any from 1-400`)
    } else {
      safeLoop(parseInt(splitSuffix[0]))
    }
    let messageArray = []

    function safeLoop (amount) {
      if (amount !== 0) {
        if (amount > 100) {
          msg.channel.getMessages(100).then((m) => {
            messageArray = messageArray.concat(m)
            amount = amount - 100
            safeLoop(amount)
          })
        } else {
          msg.channel.getMessages(amount).then((m) => {
            messageArray = messageArray.concat(m)
            amount = amount - amount
            safeLoop(amount)
          })
        }
      } else {
        let messagesString = messageArray.reverse().map(m => `${m.author.username}#${m.author.discriminator} (${m.author.id}) | ${new Date(m.timestamp)}: ${m.content ? m.content : 'No Message Content'}${m.embeds.length !== 0 ? ' ======> Contains Embed' : ''}${m.attachments.length !== 0 ? ` =====> Attachment: ${m.attachments[0].filename}:${m.attachments[0].url}` : ''}`).join('\r\n')
        request
      .post(`https://paste.lemonmc.com/api/json/create`)
      .send({
        data: messagesString,
        language: 'text',
        private: true,
        title: `${msg.channel.name.substr(0, 20)}`,
        expire: '21600'
      })
      .end((err, res) => {
        if (!err && res.statusCode === 200 && res.body.result.id) {
          msg.channel.createMessage(`<@${msg.author.id}>, **${messageArray.length}** message(s) could be archived. Link: https://paste.lemonmc.com/${res.body.result.id}/${res.body.result.hash}`)
        } else {
          log.error(res.body)
          msg.channel.createMessage(`<@${msg.author.id}>, An error occurred while uploading your archived messages, please contact the bot author!`)
        }
      })
      }
    }
  }
}

Commands.invite = {
  name: 'invite',
  desc: 'Use this to get the bot\'s invite link',
  func: function (msg, suffix, bot) {
    msg.channel.createMessage({
      embed: {
        description: `<@${msg.author.id}>, Invite me using [this](https://discordapp.com/oauth2/authorize?client_id=298822483060981760&scope=bot&permissions=380065)`,
        color: 8351671
      }
    })
  }
}

Commands.get = {
  name: 'get',
  desc: 'Get a channel, user, server, anything.',
  hidden: true,
  func: function (msg, suffix, bot) {
    if (checkCanUse(msg.author.id, 'eval')) {
      let user = bot.users.get(suffix) || bot.users.filter(u => u.username.toLowerCase().startsWith(suffix))[0]
      let guild = bot.guilds.get(suffix) || bot.guilds.filter(g => g.name.toLowerCase().startsWith(suffix))[0]
      let channel = guild ? undefined : bot.getChannel(suffix)
      let fields = []
      if (user) {
        fields.push({
          name: 'Name',
          value: `Known as: **${user.username}#${user.discriminator}**\nID: **${user.id}**\n<@${user.id}>`
        }, {
          name: 'Creation',
          value: `**${new Date(user.createdAt).toString().substr(0, 21)}**`
        }, {
          name: 'Avatar',
          value: `**[Click Me](${user.avatar ? user.avatarURL : user.defaultAvatarURL})**`
        })
        execute()
      } else if (channel) {
        fields.push({
          name: 'Name',
          value: `**${channel.name}** (**${channel.id}**)`
        }, {
          name: 'Position',
          value: `${channel.position}`
        }, {
          name: 'In Category',
          value: `**${channel.parentID ? 'Yes' : 'No'}**`
        }, {
          name: 'Part Of',
          value: `**${channel.guild.name}** (${channel.guild.id})`
        })
        execute()
      } else if (guild) {
        fields.push({
          name: 'Name',
          value: `**${guild.name}** (${guild.id})`
        }, {
          name: 'Verification Level',
          value: `${guild.verificationLevel}`
        }, {
          name: 'Owner',
          value: `**${bot.users.get(guild.ownerID).username}#${bot.users.get(guild.ownerID).discriminator}** (${guild.ownerID})`
        }, {
          name: 'Member Count',
          value: `**${guild.memberCount}**\n**${guild.members.filter(u => u.bot).length}** bots\n**${guild.members.filter(u => !u.bot).length}** users`
        }, {
          name: 'Partnership',
          value: `${guild.features.length === 0 ? 'No' : `Yes, features: ${Object.keys(guild.features).map(feature => `\`${feature}\``).join(', ')}`}`
        }, {
          name: 'Channels',
          value: `**${guild.channels.size}** total\n**${guild.channels.filter(c => c.type === 0).length}** text\n**${guild.channels.filter(c => c.type === 2).length}** voice\n**${guild.channels.filter(c => c.type === 4).length}** categories`
        }, {
          name: 'Region',
          value: `**${guild.region}**`
        }, {
          name: 'Role Count',
          value: `${guild.roles.size}`
        }, {
          name: 'Emojis',
          value: `${guild.emojis.length !== 0 ? guild.emojis.map(e => `<:${e.name}:${e.id}>`).join(', ') : 'None'}`
        })
        require('../handlers/read').getGuildDocument(guild.id).then((doc) => {
          fields.push({
            name: 'Log Channel',
            value: `${doc.logchannel ? `**${bot.getChannel(doc.logchannel).name}** (${doc.logchannel})` : 'None'}`
          }, {
            name: 'Disabled Events',
            value: `${doc.disabledEvents.length !== 0 ? `\`\`\`${doc.disabledEvents.join(', ')}\`\`\`` : 'All are enabled'}`
          }, {
            name: 'Ignored Channels',
            value: `${doc.ignoredChannels.length !== 0 ? `\`\`\`${doc.ignoredChannels.map(c => bot.getChannel(c).name).join(', ')}\`\`\`` : 'None'}`
          })
          execute()
        })
      }
      function execute () { // eslint-disable-line
        if (user || channel || guild) {
          msg.channel.createMessage({
            embed: {
              timestamp: new Date(msg.timestamp),
              color: 5231792,
              fields: fields
            }
          })
        } else {
          msg.channel.createMessage({
            embed: {
              timestamp: new Date(msg.timestamp),
              color: 16208655,
              fields: [{
                name: 'Error',
                value: 'No user, channel, or guild found!'
              }]
            }
          })
        }
      }
    } else {
      msg.channel.createMessage({
        embed: {
          timestamp: new Date(msg.timestamp),
          color: 16208655,
          fields: [{
            name: 'Error',
            value: 'You can\'t use this command!'
          }]
        }
      })
    }
  }
}

Commands.userinfo = {
  name: 'userinfo',
  desc: 'Get info from a member of the server.',
  func: function (msg, suffix, bot) {
    let fields = []
    let user = msg.channel.guild.members.find(m => m.nick === suffix) || msg.channel.guild.members.find(m => m.username === suffix) || msg.channel.guild.members.filter(u => u.username.toLowerCase().startsWith(suffix))[0]
    if (msg.mentions.length !== 0) {
      user = msg.channel.guild.members.get(msg.mentions[0].id)
    }
    if (!suffix) {
      user = msg.member
    }
    if (user) {
      let perms = []
      let color = 12552203 // away color
      if (user.status === 'online') {
        color = 8383059
      } else if (user.status === 'offline') {
        color = 12041157
      } else if (user.status === 'dnd') {
        color = 16396122
      }
      Object.keys(user.permission.json).forEach((perm) => {
        if (user.permission.json[perm] === true && notablePermissions.indexOf(perm) !== -1) {
          perms.push(perm)
        }
      })
      if (perms.length === 0) {
        perms.push('None')
      }
      fields.push({
        name: 'Name',
        value: `**${user.username}#${user.discriminator}** ${user.nick ? `(**${user.nick}**)` : ''} (${user.id})\n${user.avatar.startsWith('a_') ? 'Has Nitro or Partner' : 'Regular User'}`
      }, {
        name: 'Join Date',
        value: `**${new Date(user.joinedAt)}**`
      }, {
        name: 'Creation Date',
        value: `**${new Date(user.createdAt).toString().substr(0, 21)}**`
      }, {
        name: 'Roles',
        value: `${user.roles.length !== 0 ? user.roles.map(r => `\`${msg.channel.guild.roles.get(r).name}\``).join(', ') : 'None'}`
      }, {
        name: 'Notable Permissions',
        value: `\`${perms.join(', ')}\``
      })
      msg.channel.createMessage({embed: {
        timestamp: new Date(msg.timestamp),
        color: color,
        thumbnail: {
          url: user.avatar ? user.avatarURL : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`
        },
        fields: fields
      }})
    } else {
      msg.channel.createMessage({embed: {
        color: 16396122,
        description: '**The specified user isn\'t a member of the server**'
      }})
    }
  }
}

Commands.serverinfo = {
  name: 'serverinfo',
  desc: 'Get info about the server in which this gets used in!',
  func: function (msg, suffix, bot) {
    let guild = msg.channel.guild
    let fields = []
    fields.push({
      name: 'Name',
      value: `**${guild.name}** (${guild.id})`
    }, {
      name: 'Verification Level',
      value: `${guild.verificationLevel}`
    }, {
      name: 'Owner',
      value: `**${bot.users.get(guild.ownerID).username}#${bot.users.get(guild.ownerID).discriminator}** (${guild.ownerID})`
    }, {
      name: 'Member Count',
      value: `**${guild.memberCount}**\n**${guild.members.filter(u => u.bot).length}** bots\n**${guild.members.filter(u => !u.bot).length}** users`
    }, {
      name: 'Partnership',
      value: `${guild.features.length === 0 ? 'No' : `Yes, features: ${guild.features.map(feature => `\`${feature}\``).join(', ')}`}`
    }, {
      name: 'Channels',
      value: `**${guild.channels.size}** total\n**${guild.channels.filter(c => c.type === 0).length}** text\n**${guild.channels.filter(c => c.type === 2).length}** voice\n**${guild.channels.filter(c => c.type === 4).length}** categories`
    }, {
      name: 'Region',
      value: `**${guild.region}**`
    }, {
      name: 'Role Count',
      value: `${guild.roles.size}`
    }, {
      name: 'Emojis',
      value: `${guild.emojis.length !== 0 ? guild.emojis.map(e => `<:${e.name}:${e.id}>`).join(', ') : 'None'}`
    })

    msg.channel.createMessage({embed: {
      timestamp: new Date(msg.timestamp),
      color: 3191403,
      thumbnail: {
        url: guild.iconURL ? guild.iconURL : `http://www.kalahandi.info/wp-content/uploads/2016/05/sorry-image-not-available.png`
      },
      fields: fields
    }})
  }
}

Commands.auditlogs = {
  name: 'auditlogs',
  desc: 'Get the last x audit logs (up to 25)',
  func: function (msg, suffix, bot) {
    if (!msg.member.permission.json['viewAuditLogs']) {
      msg.channel.createMessage(`<@${msg.author.id}>, you can't view audit logs!`)
    } else if (!msg.channel.guild.members.get(bot.user.id).permission.json['viewAuditLogs']) {
      msg.channel.createMessage(`<@${msg.author.id}>, I can't view audit logs!`)
    } else if (isNaN(suffix)) {
      msg.channel.createMessage(`<@${msg.author.id}>, please provide a number between 1 and 20 to fetch.`)
    } else if (suffix > 25) {
      msg.channel.createMessage(`<@${msg.author.id}>, you can't fetch more than 20 audit logs at once.`)
    } else if (suffix < 1) {
      msg.channel.createMessage(`<@${msg.author.id}>, you can't fetch less than 1 audit logs.`)
    } else {
      msg.channel.guild.getAuditLogs(suffix).then((logs) => {
        let fields = []
        let what
        logs.entries.forEach((log) => {
          what = typeName(log.actionType)
          let reason = log.reason
          let user = log.user
          let who
          if (bot.users.get(log.targetID)) {
            who = `user **${bot.users.get(log.targetID).username}#${bot.users.get(log.targetID).discriminator}**`
          } else if (msg.channel.guild.channels.get(log.targetID)) {
            who = `channel **${msg.channel.guild.channels.get(log.targetID).name}**`
          } else if (msg.channel.guild.roles.get(log.targetID)) {
            who = `role **${msg.channel.guild.roles.get(log.targetID).name}**`
          } else {
            who = '**an unknown user/channel/role**'
          }
          if (log.member) {
            who = log.member.username ? `**${log.member.username}#${log.member.discriminator}**` : `${msg.channel.guild.members.get(log.member.id).username}#${msg.channel.guild.members.get(log.member.id).discriminator}`
          }
          fields.push({
            name: what,
            value: `From **${user.username}#${user.discriminator}** against/affecting ${who} ${reason ? `with the reason \`${reason}\`` : ''}`
          })
        })
        msg.channel.createMessage({content: `__Showing last **${suffix}** logs.__`,
          embed: {
            timestamp: new Date(msg.timestamp),
            color: 8039393,
            fields: fields
          }})
      })
    }
  }
}

Commands.help = {
  name: 'help',
  desc: 'Provides help with the bot\'s functionality',
  func: function (msg, suffix, bot) {
    let cmdArray = [`__Help for Logger__\n\n`]
    Object.keys(Commands).forEach((cmd) => {
      if (!Commands[cmd].hasOwnProperty('hidden')) {
        cmdArray.push(`**${Commands[cmd].name}**: ${Commands[cmd].desc}\n`)
      } else if (checkCanUse(msg.author.id, 'eval')) {
        cmdArray.push(`**${Commands[cmd].name}**: ${Commands[cmd].desc}\n`)
      }
    })
    cmdArray.push(`\nNeed an easier way to manage your bot? Check out http://logger.whatezlife.com\nHave any questions or bugs? Feel free to join my home server and ask!\nhttps://discord.gg/ed7Gaa3`)
    msg.addReaction('📜').catch(() => {})
    msg.author.getDMChannel().then((DMChannel) => {
      DMChannel.createMessage(cmdArray.join('')).catch(() => {})
    })
  }
}

export { Commands }
