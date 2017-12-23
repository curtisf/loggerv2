import { Redis } from '../Logger'
import { sendToLog } from '../system/modlog'
import { updateOverview } from '../handlers/read'

module.exports = {
  name: 'guildMemberAdd',
  type: 'guildMemberAdd',
  toggleable: true,
  run: function (bot, raw) {
    updateOverview(raw.guild.id)
    let guild = raw.guild
    let member = raw.member
    if (member) {
      let obj = {
        guildID: guild.id,
        type: `Member Joined${member.id === '212445217763229699' ? ' (Logger Staff)' : ''}`,
        changed: `► Name: **[\`${member.username}#${member.discriminator}\`](https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.jpg)** (${member.id})\n► Account Age: **${Math.floor((new Date() - member.user.createdAt) / 86400000)}** days\n► Joined At: **${new Date(member.joinedAt).toString().substr(0, 21)}**${member.bot ? '\n► Joined via OAuth invite.' : ''}`,
        color: 65355,
        against: member,
        simple: `**${member.username}#${member.discriminator}** joined the server.`
      }
      let lastJoin = `${new Date().getTime()}` // automatic stringify
      guild.getInvites().then((invites) => {
        let currentInvites = invites.map((inv) => `${inv.code}|${inv.uses ? inv.uses : 'Infinite'}`)
        Redis.existsAsync(`${guild.id}:invites`).then((response) => {
          if (response) {
            Redis.getAsync(`${guild.id}:invites`).then((r) => {
              r = r.split(',')
              if (r === currentInvites) {
                if (guild.features.includes('VANITY_URL')) {
                  obj.changed += `\n► Joined using Vanity URL`
                  Redis.existsAsync(`${guild.id}:lastJoin`).then((res) => {
                    if (res) {
                      Redis.getAsync(`${guild.id}:lastJoin`).then((lastTime) => {
                        if (lastJoin - lastTime < 3000) {
                          obj.changed += `\n► Possible Raid Detected!`
                          obj.color = 16711680
                          sendToLog(this.name, bot, obj)
                          Redis.set(`${guild.id}:lastJoin`, lastJoin) // the nesting is necessary because Redis.set executes faster than getAsync
                        } else {
                          sendToLog(this.name, bot, obj)
                          Redis.set(`${guild.id}:lastJoin`, lastJoin)
                        }
                      })
                    } else {
                      sendToLog(this.name, bot, obj)
                      Redis.set(`${guild.id}:lastJoin`, lastJoin)
                    }
                  })
                } else {
                  sendToLog(this.name, bot, obj)
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
                  if (!member.bot) {
                    obj.changed += `\n► Using Invite: **${code}**, with **${uses}** use(s)`
                  }
                  Redis.existsAsync(`${guild.id}:lastJoin`).then((res) => {
                    if (res) {
                      Redis.getAsync(`${guild.id}:lastJoin`).then((lastTime) => {
                        if (lastJoin - lastTime < 3000) {
                          obj.changed += `\n► Possible Raid Detected!`
                          obj.color = 16711680
                          sendToLog(this.name, bot, obj)
                          Redis.set(`${guild.id}:lastJoin`, lastJoin)
                        } else {
                          sendToLog(this.name, bot, obj)
                          Redis.set(`${guild.id}:lastJoin`, lastJoin)
                        }
                      })
                    } else {
                      sendToLog(this.name, bot, obj)
                      Redis.set(`${guild.id}:lastJoin`, lastJoin)
                    }
                  })
                  Redis.del(`${guild.id}:invites`)
                  Redis.set(`${guild.id}:invites`, `${currentInvites}`)
                } else {
                  Redis.set(`${guild.id}:lastJoin`, lastJoin)
                  Redis.set(`${guild.id}:invites`, `${currentInvites}`)
                  sendToLog(this.name, bot, obj)
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
              if (lastJoin - lastTime < 3000) {
                obj.changed += `\n► Possible Raid Detected!`
                obj.color = 16711680
                sendToLog(this.name, bot, obj)
                Redis.set(`${guild.id}:lastJoin`, lastJoin)
              } else {
                sendToLog(this.name, bot, obj)
                Redis.set(`${guild.id}:lastJoin`, lastJoin)
              }
            })
          } else {
            sendToLog(this.name, bot, obj)
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
