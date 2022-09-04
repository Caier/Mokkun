import { ApplicationCommandType, CacheType, ChannelType, ChatInputCommandInteraction, GuildMember, Interaction, InteractionType, MessageContextMenuCommandInteraction, TextChannel, UserContextMenuCommandInteraction } from "discord.js";
import { InteractionContext } from "../../util/commands/Context.js";
import { ICommand } from "../../util/commands/ICommand.js";
import SafeEmbed from "../../util/embed/SafeEmbed.js";
import { SilentError, LoggedError } from "../../util/errors/errors.js";
import BaseEventHandler from "../BaseEventHandler.js";

export default class extends BaseEventHandler {
    event() { return 'interactionCreate' as const }

    async onevent(int: Interaction) {
        if(int.type != InteractionType.ApplicationCommand && int.type != InteractionType.ApplicationCommandAutocomplete)
            return;

        if(int.isAutocomplete()) {
            let cmd = this.bot.commands.commands.get(int.commandName)!;
            if(int.options.getSubcommandGroup(false) && int.options.getSubcommand(false))
                cmd = cmd.subcommands!.get(int.options.getSubcommandGroup()!)!.subcommands!.get(int.options.getSubcommand())!;
            else if(int.options.getSubcommand(false))
                cmd = cmd.subcommands!.get(int.options.getSubcommand())!;
            if(cmd.autocomplete)
                try {
                    await int.respond(await cmd.autocomplete(int, this.bot));
                } catch(e) {
                    if(process.env.DEBUG)
                        console.error(`Autocomplete error for ${int.commandName}:\n${e}`);
                }
            return;
        }
        else if(int.isChatInputCommand()) {
            let cmds: ICommand[] = [this.bot.commands.commands.get(int.commandName)!];
            if(int.options.getSubcommandGroup(false))
                cmds.push(cmds[0].subcommands!.get(int.options.getSubcommandGroup(true))!);
            if(int.options.getSubcommand(false))
                cmds.push(cmds[cmds.length - 1].subcommands!.get(int.options.getSubcommand(true))!);
            
            const reason = (r: string) => int.reply({ embeds: [SafeEmbed.quick(r, { in: 'TITLE' })] });
            for(let cmd of cmds) {
                if(cmd.deprecated)
                    reason("**Ta komenda została wyłączona**");
                else if(cmd.ownerOnly && int.user.id != this.bot.vars.BOT_OWNER)
                    reason("**Z tej komendy może korzystać tylko owner bota!**");
                else if(int.guild && cmd.nsfw && !(int.channel as TextChannel).nsfw)
                    reason("**Ten kanał nie pozwala na wysyłanie wiadomości NSFW!**");
                else if(cmd.notdm && int.channel!.type == ChannelType.DM)
                    reason("**Z tej komendy nie można korzystać na PRIV!**");
                else if(int.guild && cmd.permissions && !cmd.permissions.every(perm => (int.member as GuildMember).permissionsIn(int.channel as TextChannel).has(perm)))
                    reason(`**Nie posiadasz odpowiednich uprawnień:**\n${cmd.permissions.filter(p => !(int.member as GuildMember).permissionsIn(int.channel as TextChannel).has(p)).join("\n")}`);
                else
                    continue;
                
                return;
            }

            let cmd = cmds.pop()!;
            try {
                await cmd.execute?.(new InteractionContext(int, cmd, this.bot, int.guild && this.bot.db.Data?.[int.guild.id]?.prefix || '.'));
            } catch(err) {
                if(err instanceof SilentError || err instanceof LoggedError)
                    return;
                if(process.env.DEBUG)
                    console.error(err);
                const msg = { embeds: [SafeEmbed.quick(`**Napotkano na błąd podczas wykonywania tej komendy :(**\n${err}`, { in: "DESC" })] };
                try {
                    if(int.replied)
                        await int.followUp(msg);
                    else 
                        await int.reply(msg);
                }
                catch(_) {
                    int.channel?.send(msg).catch(() => {});
                }
            }
        }
    }
}