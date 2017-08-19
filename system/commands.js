import { checkCanUse, checkIfAllowed } from './utils'
import { log } from './log'
import util from 'util'
import path from 'path'

let eventsObj = require('require-all')(path.join(__dirname, '/../events'))
let events = []
Object.keys(eventsObj).map((event) => eventsObj[event]).map((event) => event.type).forEach((e) => {
  if (e) {
    events.push(e)
  }
})
let Commands = []

Commands.ping = {
  name: 'ping',
  desc: 'Return pseudo-ping for the bot.',
  func: function (msg) {
    msg.channel.sendMessage('Pong!').then((m) => {
      m.edit(`Pong! Pseudo-ping: ${Math.floor(new Date(m.timestamp) - new Date(msg.timestamp))} ms`)
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
        'icon_url': `${bot.User.avatarURL}`,
        'text': `${bot.User.username}#${bot.User.discriminator}`
      },
      'thumbnail': {
        'url': `${bot.User.avatarURL}`
      },
      'fields': [{
        'name': 'General Information',
        'value': `Logger's task is to log actions from users to a specified channel. This is accomplished by using **ub!setchannel** in the wanted channel.` // not exposing Config. nope.
      },
      {
        'name': 'Technical Details',
        'value': 'Logger is written in JavaScript utilizing the Node.js runtime. It uses the **discordie** library to interact with the Discord API. For data storage, RethinkDB and Redis are used.'
      },
      {
        'name': 'The Authors',
        'value': 'Logger is developed and maintained by [LWTech#7575](https://github.com/LWTechGaming) and [Piero#2048](https://github.com/caf203). You can contact my maintainers via my [home server](https://discord.gg/dYmudv3).'
      }]
    }
    msg.channel.sendMessage('', false, info)
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
          let evalContent = util.inspect(eval(suffix), { // eslint-disable-line
            depth: 1
          })
        if (evalContent.length >= 2000) {
          evalContent = evalContent.substr(0, 1990) + '(cont)'
          msg.channel.sendMessage('```xl\n' + evalContent + '```').then((m) => {
            m.edit('```xl\n' + evalContent + '```')
          })
        } else {
          let init = new Date(msg.timestamp)
          msg.channel.sendMessage('```xl\n' + evalContent + '```').then((m) => {
            m.edit(`Eval done in \`${Math.floor(new Date(m.timestamp) - init)}\` ms!\n` + '```xl\n' + evalContent + '```')
          })
        }
      } catch (e) {
        msg.channel.sendMessage('Error:\n' + '```xl\n' + e + '```')
      }
    }
  }
}

Commands.setchannel = {
  name: 'setchannel',
  desc: 'Use in the channel you want me to log to.',
  func: function (msg, suffix, bot) {
    let allowed = checkIfAllowed(msg)
    let botPerms = bot.User.permissionsFor(msg.channel)
    if (botPerms.Text.SEND_MESSAGES) {
      if (allowed) {
        require('../handlers/update').updateGuildDocument(msg.guild.id, { // to avoid globally requiring db handler functions
          'logchannel': msg.channel.id
        }).then((r) => {
          if (r === true) {
            msg.reply(`I will now log actions to **${msg.channel.name}**!`)
          } else {
            msg.reply(`An error has occurred while setting the log channel, please try again.`)
            log.error(`Error while setting channel for guild ${msg.guild.name} (${msg.guild.id}).`)
            log.error(r)
          }
        })
      } else {
        msg.reply(`You can't use this command! Required: **Manage Server** or **Administrator**`)
      }
    } else {
      msg.author.openDM().then((DMChannel) => {
        DMChannel.sendMessage(`I can't send messages to **${msg.channel.name}**!`)
      }).catch(() => {}) // if you have dms disabled and the bot can't send messages to the log channel, sucks for you.
    }
  }
}

Commands.clearchannel = {
  name: 'clearchannel',
  desc: 'Use this to clear the logchannel associated with the server.',
  func: function (msg, suffix, bot) {
    let allowed = checkIfAllowed(msg)
    if (allowed) {
      require('../handlers/update').updateGuildDocument(msg.guild.id, { // to avoid globally requiring db handler functions
        'logchannel': ''
      }).then((r) => {
        if (r === true) {
          msg.reply(`Log channel wiped!`)
        } else {
          msg.reply(`An error has occurred while clearing the log channel, please try again.`)
          log.error(`Error while  for guild ${msg.guild.name} (${msg.guild.id}).`)
          log.error(r)
        }
      })
    } else {
      msg.reply(`You can't use this command! Required: **Manage Server** or **Administrator**`)
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
    if (allowed) {
      getGuildDocument(msg.guild.id).then((res) => {
        if (res) {
          if (res.ignoredChannels.indexOf(msg.channel.id) !== -1) {
            res.ignoredChannels.splice(res.ignoredChannels.indexOf(msg.channel.id), 1)
            updateGuildDocument(msg.guild.id, {
              'ignoredChannels': res.ignoredChannels
            }).then((resp) => {
              if (resp === true) {
                msg.reply(`I will resume logging events in **${msg.channel.name}**!`)
              } else {
                msg.reply(`Something went wrong while trying to resume logging to **${msg.channel.name}**, please try again.`)
                log.error(`Error while removing ${msg.channel.id} from the ignored channel array, guild ID ${msg.guild.id}.`)
                log.error(resp)
              }
            })
          } else {
            res.ignoredChannels.push(msg.channel.id)
            updateGuildDocument(msg.guild.id, {
              'ignoredChannels': res.ignoredChannels
            }).then((resp) => {
              if (resp === true) {
                msg.reply(`I will not log events in **${msg.channel.name}** anymore!`)
              } else {
                msg.reply(`Something went wrong while trying to ignore **${msg.channel.name}**, please try again.`)
                log.error(`Error while adding ${msg.channel.id} from the ignored channel array, guild ID ${msg.guild.id}.`)
                log.error(resp)
              }
            })
          }
        } // silently recover guild document
      })
    } else {
      msg.reply(`You can't use this command! Required: **Manage Server** or **Administrator**`)
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
    if (allowed) {
      if (suffix) {
        if (events.indexOf(suffix.toUpperCase()) !== -1) {
          getGuildDocument(msg.guild.id).then((res) => {
            if (res) {
              if (res.disabledEvents.indexOf(suffix.toUpperCase()) !== -1) {
                res.disabledEvents.splice(res.disabledEvents.indexOf(suffix.toUpperCase()), 1)
                updateGuildDocument(msg.guild.id, {
                  'disabledEvents': res.disabledEvents
                }).then((resp) => {
                  if (resp === true) {
                    msg.reply(`Module **${suffix.toUpperCase()}** has been enabled.`)
                  } else {
                    msg.reply(`Something went wrong while trying to enable module **${suffix.toUpperCase()}**, please try again.`)
                    log.error(`Error while enabling module ${suffix.toUpperCase()}, guild ID ${msg.guild.id}.`)
                    log.error(resp)
                  }
                })
              } else {
                res.disabledEvents.push(suffix.toUpperCase())
                updateGuildDocument(msg.guild.id, {
                  'disabledEvents': res.disabledEvents
                }).then((resp) => {
                  if (resp === true) {
                    msg.reply(`Module **${suffix.toUpperCase()}** has been disabled.`)
                  } else {
                    msg.reply(`Something went wrong while trying to disable module **${suffix.toUpperCase()}**, please try again.`)
                    log.error(`Error while disabling module ${suffix.toUpperCase()}, guild ID ${msg.guild.id}.`)
                    log.error(resp)
                  }
                })
              }
            } // silently recover guild document
          })
        } else {
          msg.reply('Invalid module! Try using ub!help')
        }
      } else {
        msg.reply('You didn\'t provide a module name! Try using ub!help.')
      }
    } else {
      msg.reply(`You can't use this command! Required: **Manage Server** or **Administrator**`)
    }
  }
}

Commands.lastnames = {
  name: 'lastnames',
  desc: 'Provide mention(s) or a userid',
  func: function (msg, suffix, bot) {
    if (suffix) {
      if (msg.mentions.length !== 0) {
        if (msg.mentions.length > 1) {
          msg.reply('One at a time, please!')
        } else {
          require('../handlers/read').getUserDocument(msg.mentions[0].id).then((doc) => {
            if (doc) {
              msg.channel.sendMessage(`Previous names: \`\`\`xl\n${doc.names ? doc.names.filter((name, pos) => doc.names.indexOf(name) === pos).join(', ') : 'None'}\`\`\``)
            } else {
              msg.reply(`I have no stored names for **${msg.mentions[0].username}**!`)
            }
          })
        }
      } else {
        let splitSuffix = suffix.split()
        let member = msg.guild.members.find(m => m.id === splitSuffix[0])
        if (member) {
          require('../handlers/read').getUserDocument(member.id).then((doc) => {
            if (doc) {
              msg.channel.sendMessage(`Previous names: \`\`\`xl\n${doc.names ? doc.names.filter((name, pos) => doc.names.indexOf(name) === pos).join(', ') : 'None'}\`\`\``)
            } else {
              msg.reply(`I have no stored names for **${member.username}**!`)
            }
          })
        } else {
          msg.reply('The specified ID isn\'t a member of this server!')
        }
      }
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
      }
    })
    cmdArray.push(`\nHave any questions or bugs? Feel free to join my home server and ask!\nhttps://discord.gg/NaN39J8`)
    msg.addReaction('📜').catch(() => {})
    msg.author.openDM().then((DMChannel) => {
      DMChannel.sendMessage(cmdArray.join('')).catch(() => {})
    })
  }
}

export { Commands }
