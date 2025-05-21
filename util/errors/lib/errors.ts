import { TextChannel } from 'discord.js';

export class LoggedError extends Error {
    public channel?: TextChannel;

    constructor(channel?: TextChannel, message?: string) { 
        super(message);
        this.channel = channel;
    }
}