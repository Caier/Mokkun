import { TextChannel, DMChannel, NewsChannel, ColorResolvable, PartialDMChannel, ThreadChannel } from 'discord.js';
import Context from '../commands/Context';
import { SafeEmbed } from '../embed/SafeEmbed';

export class LoggedError extends Error { //caught by the unhandled rejection handler and logged in a text channel
    constructor(ctx: TextChannel | DMChannel | Context, message?: string, cuteColor?: ColorResolvable, toConsole = false) { 
        super(message);
        let emb = cuteColor ? new SafeEmbed().setColor(cuteColor).setAuthor(message) 
            : new SafeEmbed().setColor('#FFFFFE').setDescription(`**Napotkano na błąd podczas wykonywania tej komendy :(**\n${message}`);
        if(ctx instanceof Context && ctx.replied)
            ctx.followUp({ embeds: [emb] });
        else if(ctx instanceof Context)
            ctx.reply({ embeds: [emb] });
        else    
            ctx.send({ embeds: [emb] });
        if(toConsole)
            console.error(this.message + this.stack);
    }
}

export class SilentError extends Error { //not logged anywhere
    constructor(msg?: string) {
        super(msg);
    }
}