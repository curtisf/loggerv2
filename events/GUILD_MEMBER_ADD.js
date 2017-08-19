import { Redis } from '../Logger'
import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'member_join',
  type: 'GUILD_MEMBER_ADD',
  toggleable: true,
  run: function (bot, raw) {
    let guild = raw.guild
    let member = raw.member
    if (member) {
      let obj = {
        guildID: guild.id,
        type: 'Member Joined',
        changed: `► Name: **[\`${member.username}#${member.discriminator}\`](https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.jpg)** (${member.id})\n► Account Age: **${Math.floor((new Date() - member.registeredAt) / 86400000)}** days\n► Joined At: **${member.joined_at.substr(0, 10)}**`,
        color: 8351671,
        against: member
      }
      let lastJoin = `${new Date().getTime()}` // automatic stringify
      guild.getInvites().then((invites) => {
        let currentInvites = invites.map((inv) => `${inv.code}|${inv.uses}`)
        Redis.existsAsync(`${guild.id}:invites`).then((response) => {
          if (response) {
            Redis.getAsync(`${guild.id}:invites`).then((r) => {
              r = r.split(',')
              if (r === currentInvites) {
                if (Array.from(guild.features).includes('VANITY_URL')) {
                  obj.changed += `\n► Joined using Vanity URL`
                  Redis.existsAsync(`${guild.id}:lastJoin`).then((res) => {
                    if (res) {
                      Redis.getAsync(`${guild.id}:lastJoin`).then((lastTime) => {
                        if (lastJoin - lastTime < 8000) {
                          obj.changed += `\n► Possible Raid Detected!`
                          obj.color = 16711680
                          sendToLog(bot, obj)
                          Redis.set(`${guild.id}:lastJoin`, lastJoin) // the nesting is necessary because Redis.set executes faster than getAsync
                        } else {
                          sendToLog(bot, obj)
                          Redis.set(`${guild.id}:lastJoin`, lastJoin)
                        }
                      })
                    } else {
                      sendToLog(bot, obj)
                      Redis.set(`${guild.id}:lastJoin`, lastJoin)
                    }
                  })
                } else {
                  obj.changed += `\n► Joined via OAUTH flow.`
                  sendToLog(bot, obj)
                  Redis.del(`${guild.id}:invites`)
                  Redis.set(`${guild.id}:lastJoin`, lastJoin)
                }
                Redis.set(`${guild.id}:invites`, `${currentInvites}`)
              } else {
                let used = compareInvites(currentInvites, r)
                if (used && used.length !== 0) {
                  let split = used.split('|')
                  let code = split[0]
                  let uses = split[1]
                  obj.changed += `\n► Using Invite: **${code}**, with **${uses}** use(s)`
                  Redis.existsAsync(`${guild.id}:lastJoin`).then((res) => {
                    if (res) {
                      Redis.getAsync(`${guild.id}:lastJoin`).then((lastTime) => {
                        if (lastJoin - lastTime < 8000) {
                          obj.changed += `\n► Possible Raid Detected!`
                          obj.color = 16711680
                          sendToLog(bot, obj)
                          Redis.set(`${guild.id}:lastJoin`, lastJoin)
                        } else {
                          sendToLog(bot, obj)
                          Redis.set(`${guild.id}:lastJoin`, lastJoin)
                        }
                      })
                    } else {
                      sendToLog(bot, obj)
                      Redis.set(`${guild.id}:lastJoin`, lastJoin)
                    }
                  })
                  Redis.del(`${guild.id}:invites`)
                  Redis.set(`${guild.id}:invites`, `${currentInvites}`)
                } else {
                  Redis.set(`${guild.id}:lastJoin`, lastJoin)
                  Redis.set(`${guild.id}:invites`, `${currentInvites}`)
                  sendToLog(bot, obj)
                }
              }
            })
          } else {
            Redis.set(`${guild.id}:lastJoin`, lastJoin)
            Redis.set(`${guild.id}:invites`, `${currentInvites}`)
          }
        })
      }).catch((e) => {
        Redis.existsAsync(`${guild.id}:lastJoin`).then((res) => {
          if (res) {
            Redis.getAsync(`${guild.id}:lastJoin`).then((lastTime) => {
              if (lastJoin - lastTime < 8000) {
                obj.changed += `\n► Possible Raid Detected!`
                obj.color = 16711680
                sendToLog(bot, obj)
                Redis.set(`${guild.id}:lastJoin`, lastJoin)
              } else {
                sendToLog(bot, obj)
                Redis.set(`${guild.id}:lastJoin`, lastJoin)
              }
            })
          } else {
            sendToLog(bot, obj)
            Redis.set(`${guild.id}:lastJoin`, lastJoin)
          }
        })
      })
    }
  }
}

function compareInvites (current, saved) {
  let i = 0
  for (i = 0; i < current.length; i++) {
    if (current[i] !== saved[i]) return current[i]
  }
  return false
}
