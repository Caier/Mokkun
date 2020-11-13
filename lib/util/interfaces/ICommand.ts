import { Collection, PermissionString } from 'discord.js';
import { CmdParams as c } from '../cmdUtils';

export interface ICommand {
    name: string
    description: string
    usage?: string
    ownerOnly?: boolean
    notdm?: boolean
    aliases?: string[]
    nsfw?: boolean
    group?: string
    permissions?: PermissionString[]
    deprecated?: boolean
    subcommandGroup?: boolean
    subcommands?: Collection<string, ICommand>
    execute?(msg: c.m, args: c.a, bot: c.b) : void
}

export interface ICmdGroup {
    [prop: string]: ICommand
}