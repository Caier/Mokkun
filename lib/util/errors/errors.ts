import { TextChannel, DMChannel } from 'discord.js';

export class LoggedError extends Error { //caught by the unhandled rejection handler and logged in a text channel
    public channel?: TextChannel | DMChannel;

    constructor(channel?: TextChannel | DMChannel, message?: string) { 
        super(message);
        this.channel = channel;
    }
}

export class SilentError extends Error { //not logged anywhere
    constructor(msg?: string) {
        super(msg);
    }
}