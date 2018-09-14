import { sendToLog } from '../system/modlog'
import { addNewName } from '../handlers/update'
import { Redis } from '../Logger'
import { updateGuildDocument } from '../handlers/update'

module.exports = {
    name: 'guildMemberUpdate',
    type: 'guildMemberUpdate',
    toggleable: true,
    run: function (bot, raw) {
        let guild = raw.guild
        let member = raw.member
        let oldMember = raw.oldMember
        let obj = {
            guildID: guild.id,
            type: `Unknown Role Change`,
            changed: `► Name: **${member.username}#${member.discriminator}**`,
            color: 8351671,
            against: member
        }
        if (member.roles.length !== oldMember.roles.length || member.roles.filter(r => !oldMember.roles.includes(r)).length !== 0) {
            guild.getAuditLogs(1, null, 25).then((log) => {
                let auditEntryDate = new Date((log.entries[0].id / 4194304) + 1420070400000)
                if (new Date().getTime() - auditEntryDate.getTime() < 3000) {
                    log.entries[0].guild = []
                    let user = log.entries[0].user
                    if (user.bot) {
                        Redis.existsAsync(`${guild.id}:logBots`).then((exist) => {
                            if (exist) {
                                Redis.getAsync(`${guild.id}:logBots`).then((res) => {
                                    if (res === 'true') {
                                        processRoleChange()
                                    }
                                })
                            } else {
                                updateGuildDocument(guild.id, { 'logBots': false })
                            }
                        })
                    } else {
                        processRoleChange()
                    }
                    function processRoleChange() {
                        let added = []
                        let removed = []
                        let roleColor
                        if (log.entries[0].after.$add) {
                            if (log.entries[0].after.$add.length !== 0) log.entries[0].after.$add.forEach(r => added.push(r))
                        }
                        if (log.entries[0].after.$remove) {
                            if (log.entries[0].after.$remove.length !== 0) log.entries[0].after.$remove.forEach(r => removed.push(r))
                        }
                        if (added.length !== 0) roleColor = added[0].color ? added[0].color : 8351671
                        else if (removed.length !== 0) roleColor = removed[0].color ? removed[0].color : 8351671
                        obj = {
                            guildID: guild.id,
                            type: `User Roles Manipulated`,
                            changed: `► Name: **${member.username}#${member.discriminator}** (${member.id}) <@${member.id}>\n${added.map(role => `<:plus:480606882311176192> **${role.name}** (${role.id})`).join('\n')}${removed.map((role, i) => `${i === 0 && added.length !== 0 ? '\n' : ''}<:fullredminus:480606882294267924> **${role.name}** (${role.id})`).join('\n')}`,
                            color: roleColor,
                            against: member,
                            simple: `**${user.username}#${user.discriminator}** affecting **${member.username}#${member.discriminator}** ${added.map(role => `+**${role.name}** `)}${removed.map(role => `-**${role.name}** `)}`
                        }
                        obj.footer = {
                            text: `Role(s) manipulated by ${user.username}#${user.discriminator}`,
                            icon_url: `${user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`}`
                        }
                        sendToLog('guildMemberUpdate', bot, obj) // scoping stops 'this' from being valid
                    }
                }
            }).catch(() => {
                obj.simple = `Unknown role change affecting **${member.username}#${member.discriminator}**`
                obj.footer = {
                    text: 'I cannot view audit logs!',
                    icon_url: 'http://www.clker.com/cliparts/C/8/4/G/W/o/transparent-red-circle-hi.png'
                }
                sendToLog(this.name, bot, obj)
            })
        } else if (member.nick !== oldMember.nick) {
            sendToLog(this.name, bot, {
                guildID: guild.id,
                type: 'Nickname Changed',
                changed: `► Now: **${member.nick ? member.nick : member.username}#${member.discriminator}**\n► Was: **${oldMember.nick ? oldMember.nick : member.username}#${member.discriminator}**\n► ID: **${member.id}**`,
                color: 8351671,
                against: member,
                simple: `Nickname change involving **${member.username}**: changed from **${oldMember.nick ? oldMember.nick : member.username}#${member.discriminator}** to **${member.nick ? member.nick : member.username}#${member.discriminator}**.`
            })
        }
    }
}
