import { TextChannel, DMChannel, NewsChannel, ColorResolvable, PartialDMChannel, ThreadChannel } from 'discord.js';
import { SafeEmbed } from '../embed/SafeEmbed';

export class LoggedError extends Error { //caught by the unhandled rejection handler and logged in a text channel
    constructor(public channel?: TextChannel | DMChannel | PartialDMChannel | NewsChannel | ThreadChannel, message?: string, cuteColor?: ColorResolvable, toConsole = false) { 
        super(message);
        this.channel = channel;
        let emb = cuteColor ? new SafeEmbed().setColor(cuteColor).setAuthor(message) 
            : new SafeEmbed().setColor('#FFFFFE').setDescription(`**Napotkano na błąd podczas wykonywania tej komendy :(**\n${message}`);
        this.channel?.send({ embeds: [emb] });
        if(toConsole)
            console.error(this.message + this.stack);
    }
}

export class SilentError extends Error { //not logged anywhere
    constructor(msg?: string) {
        super(msg);
    }
}