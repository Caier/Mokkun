import { Guild, Message, TextChannel, DMChannel, NewsChannel } from "discord.js";

export interface IExtGuild extends Guild {
    data: any
}

export interface IExtTextChannel extends TextChannel {
    data: any
}

export interface IExtDMChannel extends DMChannel {
    data: any
}

export interface IExtNewsChannel extends NewsChannel {
    data: any
}

export interface IExtMessage extends Message {
    prefix?: string
    channel: IExtTextChannel | IExtNewsChannel | IExtDMChannel
    guild: IExtGuild
}