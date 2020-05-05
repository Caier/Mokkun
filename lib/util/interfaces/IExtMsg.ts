import { Message } from 'discord.js';

export interface IExtMessage extends Message {
    prefix?: string
}