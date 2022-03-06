import { Message, TextChannel } from "discord.js";
import Context from "../../util/commands/Context";
import { SilentError, LoggedError } from "../../util/errors/errors";
import Utils from "../../util/utils";
import BaseEventHandler, { Event } from "../BaseEventHandler";

@Event('messageCreate')
export default class extends BaseEventHandler {
    async onevent(msg: Message) {
        if(msg.channel.partial)
            ///@ts-ignore
            msg.channel = await msg.channel.fetch(true);

        let prefix = msg.guild && this.bot.db.Data?.[msg.guild.id]?.prefix || '.';

        if(msg.author.bot) return;
        
        let args = this.bot.getArgs(msg.content, prefix);

        if(this.bot.guildScripts.has(msg.guild?.id)) {
            try {
                await this.bot.guildScripts.get(msg.guild.id)(msg, args, this.bot);
            }
            catch(err) {
                if(err instanceof SilentError || err instanceof LoggedError)
                    return;
                console.error(`Error while executing guild script: ${(err as Error).stack}`);
                Utils.send(msg.channel, this.bot.emb(`**Napotkano na błąd podczas wykonywania skryptu serwerowego :(**\n${(err as Error).message}`));
            }
        }   

        if(msg.content == '.resetprefix' && msg.guild && msg.member.permissions.has("MANAGE_GUILD")) {
            this.bot.db.Data[msg.guild.id].prefix = '.';
            Utils.send(msg.channel, this.bot.emb('Zresetowano prefix do "."'));
        }

        if(!msg.content.startsWith(prefix)) return;
        if(msg.author.id != this.bot.vars.BOT_OWNER && (msg.guild && (this.bot.db.get(`Data.${msg.guild.id}.lockedComs`) || []).includes(args[0]) || (this.bot.db.get(`Data.${msg.channel.id}.lockedComs`) || []).includes(args[0]))) {
            Utils.send(msg.channel, this.bot.emb(`**Ta komenda została zablokowana na tym kanale/serwerze!**`));
            return;
        }

        await this.executeCommand(msg, args);
    }

    private async executeCommand(msg: Message, args: string[], commandScope = this.bot.commands, helpPath: string[] = []) {
        const reason = (r: string) => Utils.send(msg.channel, this.bot.emb(r));

        try {
            if(commandScope.has(args[0]) || commandScope.has('_')) {
                let cmd = commandScope.get(args[0]) || commandScope.get('_');
                if(cmd.deprecated)
                    reason("**Ta komenda została wyłączona**");
                else if(cmd.ownerOnly && msg.author.id != this.bot.vars.BOT_OWNER)
                    reason("**Z tej komendy może korzystać tylko owner bota!**");
                else if(msg.guild && cmd.nsfw && !(msg.channel as TextChannel).nsfw)
                    reason("**Ten kanał nie pozwala na wysyłanie wiadomości NSFW!**");
                else if(cmd.notdm && msg.channel.type == 'DM')
                    reason("**Z tej komendy nie można korzystać na PRIV!**");
                else if(msg.guild && cmd.permissions && !cmd.permissions.every(perm => msg.member.permissionsIn(msg.channel as TextChannel).has(perm)))
                    reason(`**Nie posiadasz odpowiednich uprawnień:**\n${cmd.permissions.filter(p => !msg.member.permissionsIn(msg.channel as TextChannel).has(p)).join("\n")}`);
                else if(cmd.subcommandGroup)
                    await this.executeCommand(msg, args.slice(1), cmd.subcommands, helpPath.push(cmd.name) && helpPath);
                else 
                    await cmd.execute(new Context(msg, cmd, this.bot, msg.guild && this.bot.db.Data?.[msg.guild.id]?.prefix || '.'));
            }
            else if(helpPath.length) {
                this.bot.sendHelp(msg, helpPath);
            }
        }
        catch(err) {
            if(err instanceof SilentError || err instanceof LoggedError)
                return;
            if(process.env.DEBUG)
                console.log(err);
            msg.reply({ allowedMentions: { repliedUser: false }, embeds: [this.bot.emb(`**Napotkano na błąd podczas wykonywania tej komendy :(**\n${err}`)] });
        }
    }
}