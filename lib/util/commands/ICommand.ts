import { ApplicationCommandAutocompleteOption, ApplicationCommandOption, ApplicationCommandOptionChoice, ApplicationCommandOptionData, ApplicationCommandSubCommand, ApplicationCommandSubCommandData, ApplicationCommandSubGroup, ApplicationCommandSubGroupData, AutocompleteInteraction, Collection, PermissionString } from 'discord.js';
import { Mokkun } from '../../mokkun';
import Context from './Context';

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
    argOpts?: { splitter?: string, free?: number }
    options?: Exclude<Exclude<ApplicationCommandOption | ApplicationCommandAutocompleteOption, ApplicationCommandSubGroup>, ApplicationCommandSubCommand>[]
    autocomplete?: (arg0: AutocompleteInteraction, arg1: Mokkun) => ApplicationCommandOptionChoice[] | Promise<ApplicationCommandOptionChoice[]>
    deprecated?: boolean
    subcommandGroup?: boolean
    subcommands?: Collection<string, ICommand>
    execute?(ctx: Context): void | Promise<void>
}

export interface ICmdGroup {
    [prop: string]: ICommand
}