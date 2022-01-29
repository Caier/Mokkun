import { TextChannel } from "discord.js";
import { SafeEmbed } from "../../util/embed/SafeEmbed";
import { SilentError, LoggedError } from "../../util/errors/errors";
import { IExtMessage } from "../../util/interfaces/DiscordExtended";
import BaseEventHandler, { Event } from "../BaseEventHandler";

@Event('message')
export default class extends BaseEventHandler {
    async onevent(msg: IExtMessage) {
        let prefix = msg.guild && this.bot.db.Data?.[msg.guild.id]?.prefix || '.';
        msg.prefix = prefix;
        msg.channel.data = this.bot.db.Data?.[msg.channel.id];
        msg.guild && (msg.guild.data = this.bot.db.Data?.[msg.guild.id]);

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
                msg.channel.send(this.bot.emb(`**Napotkano na błąd podczas wykonywania skryptu serwerowego :(**\n${(err as Error).message}`));
            }
        }   

        if(msg.content == '.resetprefix' && msg.guild && msg.member.permissions.has("MANAGE_GUILD")) {
            this.bot.db.Data[msg.guild.id].prefix = '.';
            msg.channel.send(this.bot.emb('Zresetowano prefix do "."'));
        }

        if(!msg.content.startsWith(prefix)) return;
        if(msg.author.id != this.bot.vars.BOT_OWNER && (msg.guild && (this.bot.db.get(`Data.${msg.guild.id}.lockedComs`) || []).includes(args[0]) || (this.bot.db.get(`Data.${msg.channel.id}.lockedComs`) || []).includes(args[0]))) {
            msg.channel.send(this.bot.emb(`**Ta komenda została zablokowana na tym kanale/serwerze!**`));
            return;
        }

        await this.executeCommand(msg, args);
    }

    private async executeCommand(msg: IExtMessage, args: string[], commandScope = this.bot.commands, helpPath: string[] = []) {
        const reason = (r: string) => msg.channel.send(this.bot.emb(r));

        try {
            if(commandScope.has(args[0]) || commandScope.has('_')) {
                let cmd = commandScope.get(args[0]) || commandScope.get('_');
                if(cmd.deprecated)
                    reason("**Ta komenda została wyłączona**");
                else if(cmd.ownerOnly && msg.author.id != this.bot.vars.BOT_OWNER)
                    reason("**Z tej komendy może korzystać tylko owner bota!**");
                else if(msg.guild && cmd.nsfw && !(msg.channel as TextChannel).nsfw)
                    reason("**Ten kanał nie pozwala na wysyłanie wiadomości NSFW!**");
                else if(cmd.notdm && msg.channel.type == 'dm')
                    reason("**Z tej komendy nie można korzystać na PRIV!**");
                else if(msg.guild && cmd.permissions && !cmd.permissions.every(perm => msg.member.permissionsIn(msg.channel).has(perm)))
                    reason(`**Nie posiadasz odpowiednich uprawnień:**\n${cmd.permissions.filter(p => !msg.member.permissionsIn(msg.channel).has(p)).join("\n")}`);
                else if(cmd.subcommandGroup)
                    await this.executeCommand(msg, args.slice(1), cmd.subcommands, helpPath.push(cmd.name) && helpPath);
                else 
                    await cmd.execute(msg, args, this.bot);
            }
            else if(helpPath.length) {
                this.bot.sendHelp(msg, helpPath);
            }
        }
        catch(err) {
            if(err instanceof SilentError || err instanceof LoggedError)
                return;
            console.error(`Error while executing command ${args[0]}: ${(err as Error).stack}`);
            msg.channel.send(this.bot.emb(`**Napotkano na błąd podczas wykonywania tej komendy :(**\n${(err as Error).message}`));
        }
    }
}