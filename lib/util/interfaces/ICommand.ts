import { IExtMessage } from './IExtMsg';
import { PermissionString } from 'discord.js';
import { Mokkun } from '../../mokkun';

export interface ICommand {
    name: string
    description: string
    usage: string
    ownerOnly?: boolean
    notdm?: boolean
    aliases?: string[]
    nsfw?: boolean
    permissions?: PermissionString[]
    execute(msg: IExtMessage, args: any[], bot: Mokkun) : void
}

export interface ICmdGroup {
    [prop: string]: ICommand
}