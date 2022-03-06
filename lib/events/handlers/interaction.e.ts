import { GuildMember, Interaction, TextChannel } from "discord.js";
import Context from "../../util/commands/Context";
import { SilentError, LoggedError } from "../../util/errors/errors";
import BaseEventHandler, { Event } from "../BaseEventHandler";

@Event('interactionCreate')
export default class extends BaseEventHandler {
    async onevent(int: Interaction) {
        if(!int.isCommand() && !int.isAutocomplete()) return;

        let cmd = this.bot.commands.get(int.commandName);
        if(cmd.subcommandGroup)
            cmd = cmd.subcommands.get(int.options.getSubcommand());

        if(int.isAutocomplete()) {
            if(cmd.autocomplete)
                try {
                    await int.respond(await cmd.autocomplete(int, this.bot));
                } catch(e) {
                    if(process.env.DEBUG)
                        console.error(`Autocomplete error for ${int.commandName}:\n${e}`);
                }
            return;
        }

        const reason = (r: string) => int.reply({embeds: [this.bot.emb(r)] });
        if(cmd.deprecated)
            reason("**Ta komenda została wyłączona**");
        else if(cmd.ownerOnly && int.user.id != this.bot.vars.BOT_OWNER)
            reason("**Z tej komendy może korzystać tylko owner bota!**");
        else if(int.guild && cmd.nsfw && !(int.channel as TextChannel).nsfw)
            reason("**Ten kanał nie pozwala na wysyłanie wiadomości NSFW!**");
        else if(cmd.notdm && int.channel.type == 'DM')
            reason("**Z tej komendy nie można korzystać na PRIV!**");
        else if(int.guild && cmd.permissions && !cmd.permissions.every(perm => (int.member as GuildMember).permissionsIn(int.channel as TextChannel).has(perm)))
            reason(`**Nie posiadasz odpowiednich uprawnień:**\n${cmd.permissions.filter(p => !(int.member as GuildMember).permissionsIn(int.channel as TextChannel).has(p)).join("\n")}`);
        else {
            try {
                await cmd.execute(new Context(int, cmd, this.bot, int.guild && this.bot.db.Data?.[int.guild.id]?.prefix || '.'));
            } catch(err) {
                if(err instanceof SilentError || err instanceof LoggedError)
                    return;
                if(process.env.DEBUG)
                    console.log(err);
                const msg = { embeds: [this.bot.emb(`**Napotkano na błąd podczas wykonywania tej komendy :(**\n${err}`)] };
                try {
                    if(int.replied)
                        await int.followUp(msg);
                    else 
                        await int.reply(msg);
                }
                catch(_) {
                    int.channel.send(msg);
                }
            }
        }
    }
}