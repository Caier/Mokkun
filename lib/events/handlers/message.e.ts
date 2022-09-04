import { ChannelType, Message, TextChannel } from "discord.js";
import { MessageContext } from "../../util/commands/Context.js";
import SafeEmbed from "../../util/embed/SafeEmbed.js";
import { SilentError, LoggedError } from "../../util/errors/errors.js";
import BaseEventHandler from "../BaseEventHandler.js";

export default class extends BaseEventHandler {
    event() { return 'messageCreate' as const; }

    async onevent(msg: Message) {
        if(msg.channel.partial)
            ///@ts-ignore
            msg.channel = await msg.channel.fetch(true);

        let prefix = msg.guild && this.bot.db.Data?.[msg.guild.id]?.prefix || '.';

        if(msg.author.bot) return;
        
        let args = MessageContext.getArgs(msg.content, { prefix });

        if(msg.content == '.resetprefix' && msg.guild && msg.member!.permissions.has("ManageGuild")) {
            this.bot.db.Data[msg.guild.id].prefix = '.';
            msg.channel.send({ embeds: [SafeEmbed.quick('Zresetowano prefix do "."')] });
        }

        if(!msg.content.startsWith(prefix)) return;

        await this.executeCommand(msg, args);
    }

    private async executeCommand(msg: Message, args: string[], commandScope = this.bot.commands.commands, helpPath: string[] = []) {
        const reason = (r: string) => msg.channel.send({ embeds: [SafeEmbed.quick(r)] });

        try {
            if(commandScope.has(args[0]) || commandScope.has('_')) {
                let cmd = commandScope.get(args[0])! || commandScope.get('_')!;
                if(cmd.deprecated)
                    reason("**Ta komenda została wyłączona**");
                else if(cmd.ownerOnly && msg.author.id != this.bot.vars.BOT_OWNER)
                    reason("**Z tej komendy może korzystać tylko owner bota!**");
                else if(msg.guild && cmd.nsfw && !(msg.channel as TextChannel).nsfw)
                    reason("**Ten kanał nie pozwala na wysyłanie wiadomości NSFW!**");
                else if(cmd.notdm && msg.channel.type == ChannelType.DM)
                    reason("**Z tej komendy nie można korzystać na PRIV!**");
                else if(msg.guild && cmd.permissions && !cmd.permissions.every(perm => msg.member!.permissionsIn(msg.channel as TextChannel).has(perm)))
                    reason(`**Nie posiadasz odpowiednich uprawnień:**\n${cmd.permissions.filter(p => !msg.member!.permissionsIn(msg.channel as TextChannel).has(p)).join("\n")}`);
                else if(cmd.subcommandGroup)
                    await this.executeCommand(msg, args.slice(1), cmd.subcommands, helpPath.push(cmd.name) as Omit<number, 0> && helpPath);
                else 
                    await cmd.execute?.(new MessageContext(msg, cmd, this.bot, msg.guild && this.bot.db.Data?.[msg.guild.id]?.prefix || '.'));
            }
            else if(helpPath.length) {
                //this.bot.sendHelp(msg, helpPath);
            }
        }
        catch(err) {
            if(err instanceof SilentError || err instanceof LoggedError)
                return;
            if(process.env.DEBUG)
                console.log(err);
            msg.reply({ allowedMentions: { repliedUser: false }, embeds: [SafeEmbed.quick(`**Napotkano na błąd podczas wykonywania tej komendy :(**\n${err}`, { in: "DESC" })] });
        }
    }
}