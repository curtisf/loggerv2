import {sendToLog} from '../system/modlog'
import {updateOverview} from '../handlers/read'

module.exports = {
    name: 'guildMemberKick',
    type: 'guildMemberKick',
    toggleable: true,
    run: function (bot, raw) {
        let guild = raw.guild
        let member = raw.member
        let canViewAuditLogs = guild.members.get(bot.user.id).permission.json['viewAuditLogs']
        let perpetrator = raw.perpetrator
        if (member.id !== bot.user.id) {
            let obj = {
                guildID: guild.id,
                type: 'Member Was Kicked',
                changed: '',
                color: 16230979,
                from: perpetrator,
                against: member,
                simple: `**${member.username}#${member.discriminator}** was kicked by **${perpetrator.username}#${perpetrator.discriminator}**.`
            }
            let roles = []
            member.roles.forEach(r => {
                if (guild.roles.get(r)) {
                    roles.push(guild.roles.get(r).name)
                }
            })
            obj.changed = `► Name: **[\`${member.username}#${member.discriminator}\`](https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.jpg)** (${member.id})\n► Joined At: **${member.joinedAt ? new Date(member.joinedAt).toString().substr(0, 21) : 'Unknown'}**${roles.length !== 0 ? `\n► Roles:\n\`\`\`${roles.join(', ')}\`\`\`` : ''}\n► Reason: \`${raw.reason}\``
            if (!canViewAuditLogs) obj.changed += `\n► I **need** view audit log permissions!`
            sendToLog(this.name, bot, obj)
        }
    }
}
