import { checkCanUse, checkIfAllowed } from './utils'
import { log } from './log'
import { typeName } from './determinetype'
import util from 'util'
import path from 'path'
const Config = require('../botconfig.json')
const Raven = require('raven')
const SA = require('superagent')
Raven.config(Config.raven.url).install()

let eventsObj = require('require-all')(path.join(__dirname, '/../events'))
let events = ['all']
Object.keys(eventsObj).map((event) => eventsObj[event]).map((event) => event.type).forEach((e) => {
  if (e) {
    events.push(e)
  }
})
let Commands = []
let validFeeds = ['mod', 'voice', 'messages', 'server', 'joinlog']

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
      m.edit(`Pong! Pseudo-ping: **${Math.floor(new Date(m.timestamp) - new Date(msg.timestamp))}** ms. Websocket latency: **${bot.shards.get(0).latency}** ms.`)
    }).catch(() => {})
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
        'value': `Logger's task is to log actions from users to a specified channel. This is accomplished by using **%setchannel** in the wanted channel or by using %help/the dashboard.`
      },
      {
        'name': 'Technical Details',
        'value': 'Logger is written in JavaScript utilizing the Node.js runtime. It uses the **eris** library to interact with the Discord API. For data storage, RethinkDB and Redis are used.'
      },
      {
        'name': 'The Author',
        'value': 'Logger is developed and maintained by [Piero#2048](https://github.com/caf203). You can contact him via my [home server](https://discord.gg/ed7Gaa3).'
      }]
    }
    msg.channel.createMessage({embed: info}).catch(() => {})
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
        }).catch(() => {})
      } catch (e) {
        msg.channel.createMessage('```xl\n' + e + '\n```').catch(() => {})
      }
    }
  }
}

Commands.setchannel = {
  name: 'setchannel',
  desc: 'This command will let you set one channel to log all events to, or multiple, divided feeds. Usage: \n\n`%setchannel` - Log all actions to the current channel\n\n`%setchannel [server, mod, messages, voice, joinlog]` - Log that preset of actions to the current channel\n\n`%setchannel #channel` - Log all actions to the mentioned channel\n\n`%setchannel #channel [server, mod, messages, voice, joinlog]` - Log that preset of actions to the mentioned channel',
  func: function (msg, suffix, bot) {
    let allowed = checkIfAllowed(msg)
    let botPerms = msg.channel.guild.members.get(bot.user.id).permission.json
    let loadToRedis = require('../handlers/read').loadToRedis
    let getGuildDocument = require('../handlers/read').getGuildDocument
    let updateGuildDocument = require('../handlers/update').updateGuildDocument
    if (botPerms.sendMessages) {
      if (allowed) {
        if (suffix) {
          let splitSuffix = suffix.replace(/<|>|#/g, '').split(' ')
          let ch
          try {
            ch = bot.getChannel(splitSuffix[0])
          } catch (_) {}
          if (splitSuffix.length === 2) {
            if (ch && validFeeds.includes(splitSuffix[1])) {
              getGuildDocument(msg.channel.guild.id).then((doc) => {
                if (doc && ch.id !== doc.logchannel && Object.keys(doc.feeds).filter(key => doc.feeds[key].channelID === ch.id).length === 0) {
                  if ((doc.logchannel && (splitSuffix[1] === 'joinlog' || splitSuffix[1] === 'mod')) || !doc.logchanel) {
                    doc.feeds[splitSuffix[1]].channelID = ch.id
                    updateGuildDocument(msg.channel.guild.id, { 'feeds': doc.feeds }).then((response) => {
                      if (response === true) {
                        msg.channel.createMessage(`<@${msg.author.id}>, I will now log **${splitSuffix[1]}** related actions to **${ch.name}**`)
                      } else {
                        msg.channel.createMessage(`<@${msg.author.id}>, something went wrong.`)
                        log.error(response)
                      }
                    })
                  }
                } else {
                  let reason
                  if (doc.logchannel) {
                    reason = `I'm already logging **all** actions to **${bot.getChannel(doc.logchannel).name}**! Go to <#${bot.getChannel(doc.logchannel).id}> and type \`%clearchannel\` to stop logging there`
                  }
                  if (!reason) {
                    Object.keys(doc.feeds).forEach((key) => {
                      if (doc.feeds[key].channelID === ch.id) {
                        reason = `I'm already logging **${key}** actions to **${ch.name}**! Go to <#${ch.id}> and type \`%clearchannel\` to stop logging there`
                      }
                    })
                  }
                  msg.channel.createMessage({ embed: { color: 16711680, description: `<@${msg.author.id}>, I can't log to **${ch.name}**! Reason: ${reason}.`}})
                }
              })
            } else {
              msg.channel.createMessage({ embed: { color: 16711680, description: `Incorrect usage. Read %help and try again.`}})
            }
          } else if (msg.channel.guild.channels.filter(c => c.type === 0).map(c => c.id).includes(splitSuffix[0]) && splitSuffix.length === 1) {
            getGuildDocument(msg.channel.guild.id).then((doc) => {
              if (Object.keys(doc.feeds).filter(key => doc.feeds[key].channelID === ch.id).length === 0) {
                updateGuildDocument(msg.channel.guild.id, { // to avoid globally requiring db handler functions
                  'logchannel': ch.id
                }).then((r) => {
                  if (r === true) {
                    msg.channel.createMessage(`<@${msg.author.id}>, I will now log **all** actions to **${ch.name}**! Use \`%help\` to see how you can set separate channels for certain events (joins, bans, etc)`).catch(() => {})
                    ch.createMessage(`I was told to log here by **${msg.member.nick ? msg.member.nick : msg.author.username}#${msg.author.discriminator}**. I ignore anything that happens in this channel (message edit, delete).`).catch(() => {})
                    loadToRedis(msg.channel.guild.id)
                  } else {
                    msg.channel.createMessage(`<@${msg.author.id}>, An error has occurred while setting the log channel, please try again.`).catch(() => {})
                    log.error(`Error while setting channel for guild ${msg.channel.guild.name} (${msg.channel.guild.id}).`)
                    log.error(r)
                  }
                })
              } else {
                let reason
                if (doc.logchannel) {
                  reason = `I'm already logging **all** actions to **${bot.getChannel(doc.logchannel).name}**! Go to <#${bot.getChannel(doc.logchannel).id}> and type \`%clearchannel\` to stop logging there`
                }
                if (!reason) {
                  Object.keys(doc.feeds).forEach((key) => {
                    if (doc.feeds[key].channelID === ch.id) {
                      reason = `I'm already logging **${key}** actions to **${ch.name}**! Go to <#${ch.id}> and type \`%clearchannel\` to stop logging there`
                    }
                  })
                }
                msg.channel.createMessage({ embed: { color: 16711680, description: `<@${msg.author.id}>, I can't log to **${ch.name}**! Reason: ${reason}.`}})
              }
            })
          } else if (validFeeds.includes(splitSuffix[0]) && splitSuffix.length === 1) {
            getGuildDocument(msg.channel.guild.id).then((doc) => {
              if (Object.keys(doc.feeds).filter(key => doc.feeds[key].channelID === msg.channel.id).length === 0 && !doc.logchannel) {
                doc.feeds[splitSuffix[0]].channelID = msg.channel.id
                updateGuildDocument(msg.channel.guild.id, { 'feeds': doc.feeds }).then((r) => {
                  if (r === true) {
                    msg.channel.createMessage(`<@${msg.author.id}>, I will now log **${splitSuffix[0]}** related actions to **${msg.channel.name}**!`).catch(() => {})
                    loadToRedis(msg.channel.guild.id)
                  } else {
                    msg.channel.createMessage(`<@${msg.author.id}>, An error has occurred while setting the log channel, please try again.`).catch(() => {})
                    log.error(`Error while setting channel for guild ${msg.channel.guild.name} (${msg.channel.guild.id}).`)
                    log.error(r)
                  }
                })
              } else {
                let reason
                if (doc.logchannel) {
                  reason = `I'm already logging **all** actions to **${bot.getChannel(doc.logchannel).name}**! Go to <#${bot.getChannel(doc.logchannel).id}> and type \`%clearchannel\` to stop logging there`
                }
                if (!reason) {
                  Object.keys(doc.feeds).forEach((key) => {
                    if (doc.feeds[key].channelID === msg.channel.id) {
                      reason = `I'm already logging **${key}** actions to **${msg.channel.name}**! Type \`%clearchannel\` to stop logging here`
                    }
                  })
                }
                msg.channel.createMessage({ embed: { color: 16711680, description: `<@${msg.author.id}>, I can't log here! Reason: ${reason}.`}})
              }
            })
          } else {
            msg.channel.createMessage({ embed: { color: 16711680, description: `Incorrect usage. Read %help and try again.`}})
          }
        } else {
          getGuildDocument(msg.channel.guild.id).then((doc) => {
            if (doc) {
              if (msg.channel.id !== doc.logchannel && Object.keys(doc.feeds).map(key => doc.feeds[key].channelID).join('') === '') { // incredibly confusing logic, sorry world.
                updateGuildDocument(msg.channel.guild.id, { 'logchannel': msg.channel.id }).then((response) => {
                  if (response === true) {
                    msg.channel.createMessage(`<@${msg.author.id}>, I will now log **all** actions to **${msg.channel.name}**. Make sure to checkout my full potential (feeds) using \`%help\``)
                  } else {
                    msg.channel.createMessage(`<@${msg.author.id}>, something went wrong.`)
                    log.error(response)
                  }
                })
              } else {
                let reason
                if (doc.logchannel) {
                  reason = `I'm already logging **all** actions to **${bot.getChannel(doc.logchannel).name}**! Go to <#${bot.getChannel(doc.logchannel).id}> and type \`%clearchannel\` to stop logging there`
                }
                if (!reason) {
                  Object.keys(doc.feeds).forEach((key) => {
                    if (doc.feeds[key].channelID === msg.channel.id) {
                      reason = `I'm already logging **${key}** actions to **${msg.channel.name}**! Type \`%clearchannel\` to stop logging here`
                    }
                  })
                }
                if (!reason) {
                  reason = `I'm already logging to other channels! Use \`%clearchannel\` in them to stop logging. This restriction exists so that the bot doesn't get ratelimited`
                }
                msg.channel.createMessage({ embed: { color: 16711680, description: `<@${msg.author.id}>, I can't log here! Reason: ${reason}.`}})
              }
            }
          })
        }
      } else {
        msg.channel.createMessage(`<@${msg.author.id}>, You can't use this command! Required: **Manage Server**, **Administrator**, or the \`quartermaster\` role.`)
      }
    } else {
      msg.author.getDMChannel().then((DMChannel) => {
        DMChannel.createMessage(`I can't send messages to **${msg.channel.name}**!`)
      }).catch(() => {})
    }
  }
}

Commands.clearchannel = {
  name: 'clearchannel',
  desc: 'Use this to clear the logchannel associated with the server. Usage: `%clearchannel` in the channel that you want to clear, or `%clearchannel all` to stop logging to any channel.',
  func: function (msg, suffix, bot) {
    let allowed = checkIfAllowed(msg)
    let loadToRedis = require('../handlers/read').loadToRedis
    let updateGuildDocument = require('../handlers/update').updateGuildDocument
    let getGuildDocument = require('../handlers/read').getGuildDocument
    if (allowed) {
      getGuildDocument(msg.channel.guild.id).then((doc) => {
        if (suffix === 'all') {
          updateGuildDocument(msg.channel.guild.id, {
            'logchannel': '',
            'feeds': {
              'joinlog': {
                'channelID': ''
              },
              'messages': {
                'channelID': ''
              },
              'mod': {
                'channelID': ''
              },
              'server': {
                'channelID': ''
              },
              'voice': {
                'channelID': ''
              }
            }
          }).then((r) => {
            if (r === true) {
              loadToRedis(msg.channel.guild.id)
            } else {
              msg.channel.createMessage(`<@${msg.author.id}>, An error has occurred while clearing all channels logged to, please try again.`).catch(() => {})
              log.error(`Error while clearing channel for guild ${msg.channel.guild.name} (${msg.channel.guild.id})`)
              log.error(r)
            }
          })
          Object.keys(doc.feeds).forEach((feed) => {
            if (doc.feeds[feed].channelID === msg.channel.id) {
              doc.feeds[feed].channelID = ''
              updateGuildDocument(msg.channel.guild.id, { 'feeds': doc.feeds }).then((r) => {
                if (r === true) {
                  loadToRedis(msg.channel.guild.id)
                } else {
                  msg.channel.createMessage(`<@${msg.author.id}>, An error has occurred while clearing the log channel, please try again.`).catch(() => {})
                  log.error(`Error while clearing channel for guild ${msg.channel.guild.name} (${msg.channel.guild.id}).`)
                  log.error(r)
                }
              })
            }
          })
          msg.channel.createMessage(`<@${msg.author.id}>, I won't log to anything anymore!`)
        } else if (doc.logchannel === msg.channel.id) {
          updateGuildDocument(msg.channel.guild.id, { // to avoid globally requiring db handler functions
            'logchannel': ''
          }).then((r) => {
            if (r === true) {
              loadToRedis(msg.channel.guild.id)
            } else {
              msg.channel.createMessage(`<@${msg.author.id}>, An error has occurred while clearing the log channel, please try again.`).catch(() => {})
              log.error(`Error while clearing channel for guild ${msg.channel.guild.name} (${msg.channel.guild.id}).`)
              log.error(r)
            }
          })
          msg.channel.createMessage(`<@${msg.author.id}>, I will stop logging **all** actions here!`)
        } else {
          let feedsInChannel = Object.keys(doc.feeds).filter(key => doc.feeds[key].channelID === msg.channel.id ? key : '')
          if (feedsInChannel.length !== 0) {
            feedsInChannel.forEach((feed) => {
              if (feed) {
                doc.feeds[feed].channelID = ''
                updateGuildDocument(msg.channel.guild.id, {
                  'feeds': doc.feeds
                }).then((r) => {
                  if (r === true) {
                    loadToRedis(msg.channel.guild.id)
                  } else {
                    msg.channel.createMessage(`<@${msg.author.id}>, An error has occurred while trying to stop logging here, please try again.`).catch(() => {})
                    log.error(`Error while clearing logged to channel for guild ${msg.channel.guild.name} (${msg.channel.guild.id}).`)
                    log.error(r)
                  }
                })
              }
            })
            msg.channel.createMessage(`<@${msg.author.id}>, I won't log anything to **${msg.channel.name}** anymore!`)
          }
        }
      })
    } else {
      msg.channel.createMessage(`<@${msg.author.id}>, You can't use this command! Required: **Manage Server** or **Administrator**`).catch(() => {})
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
          msg.channel.createMessage('Failed').catch(() => {})
          msg.author.getDMChannel().then((c) => {
            c.createMessage(JSON.stringify(e))
          }).catch(() => {})
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
                msg.channel.createMessage(`<@${msg.author.id}>, I will resume logging events in **${msg.channel.name}**!`).catch(() => {})
                loadToRedis(msg.channel.guild.id)
              } else {
                msg.channel.createMessage(`<@${msg.author.id}>, Something went wrong while trying to resume logging to **${msg.channel.name}**, please try again.`).catch(() => {})
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
                msg.channel.createMessage(`<@${msg.author.id}>, I will not log events in **${msg.channel.name}** anymore!`).catch(() => {})
                loadToRedis(msg.channel.guild.id)
              } else {
                msg.channel.createMessage(`<@${msg.author.id}>, Something went wrong while trying to ignore **${msg.channel.name}**, please try again.`).catch(() => {})
                log.error(`Error while adding ${msg.channel.id} from the ignored channel array, guild ID ${msg.channel.guild.id}.`)
                log.error(resp)
              }
            })
          }
        } // silently recover guild document
      })
    } else {
      msg.channel.createMessage(`<@${msg.author.id}>, You can't use this command! Required: **Manage Server** or **Administrator**`).catch(() => {})
    }
  }
}

Commands.togglemodule = {
  name: 'togglemodule',
  desc: `Use this with a valid module name to toggle a module on or off! All modules except voice are automatically enabled. Valid modules are: \`\`\`xl\n${(events.concat(['all'])).join(', ')}\`\`\``,
  func: function (msg, suffix, bot) {
    let allowed = checkIfAllowed(msg)
    let getGuildDocument = require('../handlers/read').getGuildDocument // to avoid exposing globally
    let updateGuildDocument = require('../handlers/update').updateGuildDocument
    let loadToRedis = require('../handlers/read').loadToRedis
    if (allowed) {
      if (suffix) {
        if (suffix === 'all') {
          getGuildDocument(msg.channel.guild.id).then((res) => {
            if (res) {
              updateGuildDocument(msg.channel.guild.id, {'disabledEvents': []}).then((resp) => {
                if (resp === true) {
                  msg.channel.createMessage(`<@${msg.author.id}>, **all modules enabled.**`).catch(() => {})
                  loadToRedis(msg.channel.guild.id)
                } else {
                  msg.channel.createMessage(`<@${msg.author.id}>, Something went wrong while trying to enable all modules, please try again.`).catch(() => {})
                  log.error(`Error while enabling module ${suffix}, guild ID ${msg.channel.guild.id}.`)
                  log.error(resp)
                }
              })
            }
          })
        } else if (events.indexOf(suffix) !== -1) {
          getGuildDocument(msg.channel.guild.id).then((res) => {
            if (res) {
              if (res.disabledEvents.indexOf(suffix) !== -1) {
                res.disabledEvents.splice(res.disabledEvents.indexOf(suffix), 1)
                updateGuildDocument(msg.channel.guild.id, {
                  'disabledEvents': res.disabledEvents
                }).then((resp) => {
                  if (resp === true) {
                    msg.channel.createMessage(`<@${msg.author.id}>, Module **${suffix}** has been enabled.`).catch(() => {})
                    loadToRedis(msg.channel.guild.id)
                  } else {
                    msg.channel.createMessage(`<@${msg.author.id}>, Something went wrong while trying to enable module **${suffix}**, please try again.`).catch(() => {})
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
                    msg.channel.createMessage(`<@${msg.author.id}>, Module **${suffix}** has been disabled.`).catch(() => {})
                    loadToRedis(msg.channel.guild.id)
                  } else {
                    msg.channel.createMessage(`<@${msg.author.id}>, Something went wrong while trying to disable module **${suffix}**, please try again.`).catch(() => {})
                    log.error(`Error while disabling module ${suffix}, guild ID ${msg.channel.guild.id}.`)
                    log.error(resp)
                  }
                })
              }
            } // silently recover guild document
          })
        } else {
          msg.channel.createMessage('Invalid module, casing is important! Try using %help').catch(() => {})
        }
      } else {
        msg.channel.createMessage('You didn\'t provide a module name! Try using %help.').catch(() => {})
      }
    } else {
      msg.channel.createMessage(`You can't use this command! Required: **Manage Server** or **Administrator**`).catch(() => {})
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
          msg.channel.createMessage(`<@${msg.author.id}>, One at a time, please!`).catch(() => {})
        } else {
          require('../handlers/read').getUserDocument(msg.mentions[0].id).then((doc) => {
            if (doc) {
              msg.channel.createMessage(`<@${msg.author.id}>, Previous names: \`\`\`xl\n${doc.names ? doc.names.filter((name, pos) => doc.names.indexOf(name) === pos).join(', ') : 'None'}\`\`\``).catch(() => {})
            } else {
              msg.channel.createMessage(`<@${msg.author.id}>, I have no stored names for **${msg.mentions[0].username}**!`).catch(() => {})
            }
          })
        }
      } else {
        let splitSuffix = suffix.split()
        let member = msg.channel.guild.members.get(splitSuffix[0])
        if (member) {
          require('../handlers/read').getUserDocument(member.id).then((doc) => {
            if (doc) {
              msg.channel.createMessage(`<@${msg.author.id}>, Previous names: \`\`\`xl\n${doc.names ? doc.names.filter((name, pos) => doc.names.indexOf(name) === pos).join(', ') : 'None'}\`\`\``).catch(() => {})
            } else {
              msg.channel.createMessage(`<@${msg.author.id}>, I have no stored names for **${member.username}**!`).catch(() => {})
            }
          })
        } else {
          msg.channel.createMessage(`<@${msg.author.id}>, The specified ID isn't a member of this server!`).catch(() => {})
        }
      }
    }
  }
}

Commands.archive = {
  name: 'archive',
  desc: 'Gets the last number of messages provided from the channel it is used in. (%archive [1-1000]) or search the last x messages from a user (%archive 1000 @Piero), only gathers messages in channel used.',
  func: function (msg, suffix, bot) {
    let request = require('superagent')
    let splitSuffix = suffix.split(' ')
    if (!msg.channel.guild.members.get(msg.author.id).permission.json.readMessageHistory || !msg.channel.guild.members.get(msg.author.id).permission.json.manageMessages) {
      msg.channel.createMessage(`<@${msg.author.id}>, You need **Read Message History**, **Manage Messages**, or the \`quartermaster\` role to use archive!`).catch(() => {})
    } else if (!msg.channel.guild.members.get(bot.user.id).permission.json.readMessageHistory) {
      msg.channel.createMessage(`<@${msg.author.id}>, I need the **Read Message History** permission to archive messages!`).catch(() => {})
    } else if (!suffix) {
      msg.channel.createMessage(`<@${msg.author.id}>, You need to provide a number of messages to archive! (1-600)`).catch(() => {})
    } else if (isNaN(splitSuffix[0])) {
      msg.channel.createMessage(`<@${msg.author.id}>, You need to provide a number of messages to archive! (1-600)`).catch(() => {})
    } else if (splitSuffix[0] < 1 || splitSuffix[0] > 1000) {
      msg.channel.createMessage(`<@${msg.author.id}>, Invalid number of messages provided, you can use any from 1-600`).catch(() => {})
    } else if (checkIfAllowed(msg)) {
      if (msg.mentions.length === 1) {
        fetch(parseInt(splitSuffix[0]), msg.mentions[0].id)
      } else if (msg.mentions.length > 1) {
        msg.channel.createMessage(`<@${msg.author.id}>, you may only provide one mention!`)
      } else {
        fetch(parseInt(splitSuffix[0]))
      }
    }
    let messageArray = []

    function fetch (amount, authorID) {
      msg.channel.getMessages(amount).then((messageArray) => {
        let messagesString
        if (authorID) {
          messagesString = messageArray.filter(m => m.author.id === authorID).reverse().map(m => `${m.author.username}#${m.author.discriminator} (${m.author.id}) | ${new Date(m.timestamp)}: ${m.content ? m.content : 'No Message Content'}${m.embeds.length !== 0 ? ' ======> Contains Embed' : ''}${m.attachments.length !== 0 ? ` =====> Attachment: ${m.attachments[0].filename}:${m.attachments[0].url}` : ''}`).join('\r\n')
        } else {
          messagesString = messageArray.reverse().map(m => `${m.author.username}#${m.author.discriminator} (${m.author.id}) | ${new Date(m.timestamp)}: ${m.content ? m.content : 'No Message Content'}${m.embeds.length !== 0 ? ' ======> Contains Embed' : ''}${m.attachments.length !== 0 ? ` =====> Attachment: ${m.attachments[0].filename}:${m.attachments[0].url}` : ''}`).join('\r\n')
        }
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
          msg.channel.createMessage(`<@${msg.author.id}>, **${messageArray.length}** message(s) could be archived. Link: https://paste.lemonmc.com/${res.body.result.id}/${res.body.result.hash}`).catch(() => {})
        } else {
          log.error(res.body)
          msg.channel.createMessage(`<@${msg.author.id}>, An error occurred while uploading your archived messages, please contact the bot author!`).catch(() => {})
        }
      })
      })
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
    }).catch(() => {})
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
        let owned = bot.guilds.filter(g => g.ownerID === user.id).map(g => `**${g.name}**: ${g.id}`)
        if (owned.length !== 0) {
          owned = owned.join('\n')
        } else {
          owned = 'None'
        }
        fields.push({
          name: 'Name',
          value: `Known as: **${user.username}#${user.discriminator}**\nID: **${user.id}**\n<@${user.id}>`
        }, {
          name: 'Creation',
          value: `**${new Date(user.createdAt).toString().substr(0, 21)}**`
        }, {
          name: 'Avatar',
          value: `**[Click Me](${user.avatar ? user.avatarURL : user.defaultAvatarURL})**`
        }, {
          name: 'Owned Servers',
          value: `${owned}`
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
        })
        let emojis = {
          0: []
        }
        let counter = 0
        guild.emojis.forEach((emoji) => {
          if (emojis[counter].join('\n').length > 900) {
            counter++
            emojis[counter] = []
          } else {
            emojis[counter].push(`${`<:${emoji.name}:${emoji.id}>`}`)
          }
        })
        if (emojis[0].join('').length === 0) {
          fields.push({
            name: 'Emojis',
            value: '**None**'
          })
        }
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
          Object.keys(doc.feeds).forEach((feed) => {
            if (doc.feeds[feed].channelID) {
              fields.push({
                name: `${feed} channel`,
                value: `${bot.getChannel(doc.feeds[feed].channelID).name} (${bot.getChannel(doc.feeds[feed].channelID).id})`
              })
            }
          })
          execute()
        })
      } else {
        execute()
      }
      function execute () { // eslint-disable-line
        if (user || channel || guild) {
          msg.channel.createMessage({
            embed: {
              timestamp: new Date(msg.timestamp),
              color: 5231792,
              fields: fields
            }
          }).catch(() => {})
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
          }).catch(() => {})
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
      }).catch(() => {})
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
      }}).catch(() => {})
    } else {
      msg.channel.createMessage({embed: {
        color: 16396122,
        description: '**The specified user isn\'t a member of the server**'
      }}).catch(() => {})
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
    })
    let emojis = {
      0: []
    }
    let counter = 0
    guild.emojis.forEach((emoji, index) => {
      if (emojis[counter].join('\n').length > 950) {
        if (++index === guild.emojis.length) {
          emojis[counter].push(`${`<:${emoji.name}:${emoji.id}>`}`)
        } else {
          counter++
          emojis[counter] = []
        }
      } else {
        emojis[counter].push(`${`<:${emoji.name}:${emoji.id}>`}`)
      }
    })
    if (emojis[0].join('').length !== 0) {
      Object.keys(emojis).forEach((collection, index) => {
        if (index !== 0) {
          fields.push({
            name: 'Continued',
            value: emojis[index].join(' ')
          })
        } else {
          fields.push({
            name: 'Emojis',
            value: emojis[index].join(' ')
          })
        }
      })
    } else {
      fields.push({
        name: 'Emojis',
        value: '**None**'
      })
    }
    require('../handlers/read').getGuildDocument(msg.channel.guild.id).then((doc) => {
      fields.push({
        name: 'Disabled Events',
        value: `${doc.disabledEvents.length !== 0 ? `\`\`\`${doc.disabledEvents.join(', ')}\`\`\`` : 'All are enabled'}`
      })
      send()
    })

    function send () {
      msg.channel.createMessage({embed: {
        timestamp: new Date(msg.timestamp),
        color: 3191403,
        thumbnail: {
          url: guild.iconURL ? guild.iconURL : `http://www.kalahandi.info/wp-content/uploads/2016/05/sorry-image-not-available.png`
        },
        fields: fields
      }}).catch(() => {})
    }
  }
}

Commands.auditlogs = {
  name: 'auditlogs',
  desc: 'Get the last x audit logs (up to 25)',
  func: function (msg, suffix, bot) {
    if (!msg.member.permission.json['viewAuditLogs'] && !checkIfAllowed(msg)) {
      msg.channel.createMessage(`<@${msg.author.id}>, you can't view audit logs or don't have the \`quartermaster\` role`).catch(() => {})
    } else if (!msg.channel.guild.members.get(bot.user.id).permission.json['viewAuditLogs']) {
      msg.channel.createMessage(`<@${msg.author.id}>, I can't view audit logs!`).catch(() => {})
    } else if (isNaN(suffix)) {
      msg.channel.createMessage(`<@${msg.author.id}>, please provide a number between 1 and 75 to fetch.`).catch(() => {})
    } else if (suffix > 75) {
      msg.channel.createMessage(`<@${msg.author.id}>, you can't fetch more than 75 audit logs at once.`).catch(() => {})
    } else if (suffix < 1) {
      msg.channel.createMessage(`<@${msg.author.id}>, you can't fetch less than 1 audit log.`).catch(() => {})
    } else {
      msg.channel.guild.getAuditLogs(suffix).then((logs) => {
        let what
        let fieldsArrs = {
          0: []
        }
        let counter = 0
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
          if (fieldsArrs[counter].length < 25) {
            fieldsArrs[counter].push({
              name: what,
              value: `From **${user.username}#${user.discriminator}** against/affecting ${who} ${reason ? `with the reason \`${reason}\`` : ''}`
            })
          } else {
            counter = counter + 1
            fieldsArrs[counter] = []
            fieldsArrs[counter].push({
              name: what,
              value: `From **${user.username}#${user.discriminator}** against/affecting ${who} ${reason ? `with the reason \`${reason}\`` : ''}`
            })
          }
        })
        Object.keys(fieldsArrs).forEach((num) => {
          if (num === 0) {
            msg.channel.createMessage({content: `__Showing last **${suffix}** logs.__`,
              embed: {
                timestamp: new Date(msg.timestamp),
                color: 8039393,
                fields: fieldsArrs[num]
              }}).catch(() => {})
          } else {
            msg.channel.createMessage({embed: {
              timestamp: new Date(msg.timestamp),
              color: 8039393,
              fields: fieldsArrs[num]
            }}).catch(() => {})
          }
        })
      })
    }
  }
}

Commands.livestats = {
  name: 'livestats',
  desc: 'I\'ll create a message and edit it when something happens with server info.',
  func: function (msg, suffix, bot) {
    let botPerms = msg.channel.guild.members.get(bot.user.id).permission.json
    let loadToRedis = require('../handlers/read').loadToRedis
    let updateGuildDocument = require('../handlers/update').updateGuildDocument
    let userPerms = msg.member.permission.json
    if (msg.channel.permissionsOf(bot.user.id).json.sendMessages) {
      if (checkIfAllowed(msg)) {
        if (botPerms.sendMessages) {
          msg.channel.createMessage('Setting overview message.').then((m) => {
            updateGuildDocument(msg.channel.guild.id, {'overviewID': `${m.channel.id}|${m.id}`}).then((res) => {
              if (res === true) {
                msg.channel.createMessage(`<@${msg.author.id}>, if you want to stop the overview from being updated, just delete the message.`).then((mes) => {
                  setTimeout(() => {
                    mes.delete().catch(() => {})
                  }, 10000)
                })
                loadToRedis(msg.channel.guild.id)
                let fields = [
                  {
                    'name': 'Member Count',
                    'value': `► **${m.channel.guild.memberCount}** total\n► **${m.channel.guild.members.filter(m => !m.bot).length}** humans\n► **${m.channel.guild.members.filter(m => m.bot).length}** bots`
                  },
                  {
                    'name': 'Channels',
                    'value': `► **${m.channel.guild.channels.filter(c => c.type === 4).length}** categories/category\n► **${m.channel.guild.channels.filter(c => c.type === 0).length}** text channels\n► **${m.channel.guild.channels.filter(c => c.type === 2).length}** voice channels`
                  },
                  {
                    'name': 'Role Count',
                    'value': `► ${msg.channel.guild.roles.size}`
                  }
                ]
                msg.channel.guild.getBans().then((b, banserror) => {
                  msg.channel.guild.getAuditLogs(1, null, 22).then((log, auditerror) => {
                    if (log.entries.length !== 0) {
                      log = log.entries[0]
                      let user = log.user
                      bot.getRESTUser(log.targetID).then((affected) => {
                        if (banserror || auditerror) {
                          fields.push({
                            'name': 'Ban Count',
                            'value': '► Missing Permissions'
                          })
                        } else {
                          fields.push({
                            'name': 'Ban Count',
                            'value': `► **Count**: ${b.length} | Last Ban: **${affected.username}#${affected.discriminator}** by **${user.username}#${user.discriminator}**${log.reason ? ` for *${log.reason}*` : ' with no reason specified.'}`
                          })
                        }
                        editMessage()
                      })
                    } else {
                      fields.push({
                        'name': 'Ban Count',
                        'value': 'None yet!'
                      })
                      editMessage()
                    }
                  })
                })
                function editMessage () {
                  m.edit({ content: '**Live Stats**',
                    embed: {
                      'title': `${msg.channel.guild.name}`,
                      'description': 'I will update with events that occur',
                      'color': 7923697,
                      'timestamp': new Date(m.timestamp),
                      'footer': {
                        'icon_url': bot.users.get(m.channel.guild.ownerID).avatarURL ? bot.users.get(m.channel.guild.ownerID).avatarURL : bot.users.get(m.channel.guild.ownerID).defaultAvatarURL,
                        'text': `${bot.users.get(m.channel.guild.ownerID).username}#${bot.users.get(m.channel.guild.ownerID).discriminator}`
                      },
                      'thumbnail': {
                        'url': m.channel.guild.iconURL ? m.channel.guild.iconURL : 'https://static1.squarespace.com/static/5937e362be659441f72e7c12/t/595120eadb29d60c5983e4a2/1498489067243/Sorry-image-not-available.png'
                      },
                      'fields': fields
                    }})
                }
              } else {
                m.edit('An error occured while setting the overview message, please try again later.')
                log.error(`Error while setting overview for guild ${msg.channel.guild.name} (${msg.channel.guild.id}):`, res)
              }
            })
          })
        } else {
          msg.author.getDMChannel().then((c) => {
            c.createMessage(`I can't send messages to **${msg.channel.name}** (${msg.channel.guild.name})!`).catch(() => {})
          })
        }
      } else {
        msg.channel.createMessage('You lack the permissions needed to use **livestats**! Needed: **Administrator**, **Manage Server**, server ownership, or the `quartermaster` role.')
      }
    } else {
      msg.author.getDMChannel().then((c) => {
        c.createMessage(`I can't send messages to **${msg.channel.name}** (${msg.channel.guild.name})!`).catch(() => {})
      })
    }
  }
}

Commands.logbots = {
  name: 'logbots',
  desc: 'Toggle whether I will log when bots delete/edit messages!',
  func: function (msg, suffix, bot) {
    let loadToRedis = require('../handlers/read').loadToRedis
    let getGuildDocument = require('../handlers/read').getGuildDocument
    let updateGuildDocument = require('../handlers/update').updateGuildDocument
    let allowed = checkIfAllowed(msg)
    if (allowed) {
      getGuildDocument(msg.channel.guild.id).then((doc) => {
        if (doc.logBots === undefined) {
          updateGuildDocument(msg.channel.guild.id, { 'logBots': false }).then((res) => {
            if (res === true) {
              Commands['logbots'].func(msg, suffix, bot)
              loadToRedis(msg.channel.guild.id)
            } else {
              msg.channel.createMessage('An error occurred while changing whether I log messages edited/deleted by bots, please try again later.')
            }
          })
        } else {
          updateGuildDocument(msg.channel.guild.id, { 'logBots': !doc.logBots }).then((res) => {
            if (res === true) {
              msg.channel.createMessage(`<@${msg.author.id}>, ${doc.logBots ? 'I will not log messages edited or deleted by bots anymore!' : 'I will now log messages edited or deleted by bots!'}`)
              loadToRedis(msg.channel.guild.id)
            } else {
              msg.channel.createMessage(`<@${msg.author.id}>, an error occurred while changing whether I log bots, please try again.`)
            }
          })
        }
      })
    } else {
      msg.channel.createMessage(`<@${msg.author.id}>, you lack the permissions to say whether I log bots or not! Needed: **Administrator**, **Manage Server**, or server ownership`)
    }
  }
}

Commands.help = {
  name: 'help',
  desc: 'Provides help with the bot\'s functionality',
  func: function (msg, suffix, bot) {
    let cmdList = {
      0: [`__Help for Logger__\n\n`]
    }
    let counter = 0
    Object.keys(Commands).forEach((cmd) => {
      if (!Commands[cmd].hasOwnProperty('hidden')) {
        if (cmdList[counter].join('\n').length > 1750) {
          counter++
          cmdList[counter] = []
        } else {
          cmdList[counter].push(`**${Commands[cmd].name}**: ${Commands[cmd].desc}\n`)
        }
      } else if (checkCanUse(msg.author.id, 'eval')) {
        if (cmdList[counter].join('\n').length > 1750) {
          counter++
          cmdList[counter] = []
        } else {
          cmdList[counter].push(`**${Commands[cmd].name}**: ${Commands[cmd].desc}\n`)
        }
      }
    })
    cmdList[counter].push(`\nNeed an easier way to manage your bot? Check out https://whatezlife.com/\nHave any questions or bugs? Feel free to join my home server and ask!\nhttps://discord.gg/ed7Gaa3\nDo you like Logger? Check out my patreon page! https://www.patreon.com/logger`)
    msg.addReaction('📜').catch(() => {})
    msg.author.getDMChannel().then((DMChannel) => {
      for (let set in cmdList) {
        DMChannel.createMessage(cmdList[set].join('')).catch(() => {})
      }
    })
  }
}

export { Commands }
