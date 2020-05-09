import { TextChannel, DMChannel } from 'discord.js';

export class LoggedError extends Error {
    public channel?: TextChannel | DMChannel;

    constructor(channel?: TextChannel | DMChannel, message?: string) { 
        super(message);
        this.channel = channel;
    }
}

export class SilentError extends Error {
    constructor(msg?: string) {
        super(msg);
    }
}