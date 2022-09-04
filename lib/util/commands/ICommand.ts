import { APIApplicationCommandBasicOption, APIApplicationCommandOptionChoice, AutocompleteInteraction, Collection, PermissionResolvable } from 'discord.js';
import { Mokkun } from '../../mokkun.js';
import Context from './Context.js';

export enum CommandGroup {
    Transit, Anime, Misc, Music, Interaction, NSFW, Owner, Administrative
}

export interface ICommand {
    name: string
    description: string
    usage?: string
    ownerOnly?: boolean
    notdm?: boolean
    aliases?: string[]
    nsfw?: boolean
    group?: CommandGroup
    permissions?: PermissionResolvable[]
    argOpts?: { splitter?: string, free?: number }
    options?: APIApplicationCommandBasicOption[]
    autocomplete?: (arg0: AutocompleteInteraction, arg1: Mokkun) => APIApplicationCommandOptionChoice[] | Promise<APIApplicationCommandOptionChoice[]>
    deprecated?: boolean
    subcommandGroup?: boolean
    subcommands?: Collection<string, ICommand>
    execute?(ctx: Context): void | Promise<void>
}