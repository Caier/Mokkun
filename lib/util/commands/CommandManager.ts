import { Collection, PermissionsBitField, REST, Routes, Utils } from "discord.js";
import { Mokkun } from "../../mokkun.js";
import { ICommand } from "./ICommand.js";
import Util from '../utils.js';
import path from "path";
import { APIApplicationCommand, ApplicationCommandOptionType, ApplicationCommandType, PermissionFlagsBits, RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { exit } from "process";
import { fileURLToPath, pathToFileURL } from "url";

export default class CommandManager {
    private static readonly cmdDir = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..', 'commands');
    private static readonly ownerOnlyAndDebugCommandGuilds = ['752199572830552104', '427235931796537374'];
    
    private rest = new REST({ version: '10' });
    readonly commands = new Collection<string, ICommand>();

    constructor(private bot: Mokkun) {}

    async start() {
        this.rest.setToken(this.bot.vars.TOKEN);
        await this.loadCommands();
        await this.registerSlashCommands();
    }

    async unregisterAll() {
        await this.rest.put(Routes.applicationCommands(this.bot.application!.id), { body: [] });
        for(let guild of CommandManager.ownerOnlyAndDebugCommandGuilds) 
            await this.rest.put(Routes.applicationGuildCommands(this.bot.application!.id, guild), { body: [] });
    }

    private async loadCommands() {       
        for(let cmd of Util.dirWalk(CommandManager.cmdDir).filter(f => f.endsWith('.c.js'))) {
            let temp = (await import(pathToFileURL(path.join(CommandManager.cmdDir, cmd)).toString())).default as { [p: string]: ICommand };
            
            for(let prop in temp) {
                if(!prop.startsWith('_')) continue;
                temp[prop].aliases = [temp[prop].name, ...(temp[prop].aliases || [])];
                for(let alias of temp[prop].aliases!) {
                    if(this.commands.has(alias))
                        throw Error('Duplicated command alias: ' + alias);
                    this.commands.set(alias, temp[prop]);
                }
            }
        }
    }

    private async registerSlashCommands() {
        const deepScrub = (cmd: ICommand) => {
            if(cmd.subcommandGroup && !cmd.ownerOnly) {
                cmd.subcommands = cmd.subcommands!.clone().mapValues(c => ({ ...c }));
                for(const c of cmd.subcommands.values()) {
                    deepScrub(c);
                    if(!c.subcommandGroup && !c.ownerOnly || c.subcommandGroup && c.subcommands!.size == 0)
                        cmd.subcommands = cmd.subcommands.filter(cmd => cmd != c);
                }
            }
            return cmd;
        };

        const Icmdset = [...new Set([...this.commands.values()])].filter(c => !c.deprecated);
        
        if(this.bot.vars.DEBUG) {
            await this.registerToGuilds(Icmdset.map(c => CommandManager.ICommandToAPICommand(c, false)));
            console.log(`Registered commands to guilds (DEBUG)`);
        } else {
            const normalCmds = Icmdset.filter(c => !c.ownerOnly).map(c => CommandManager.ICommandToAPICommand(c));
            let ownerCmds = [];
            for(const orgcmd of Icmdset)
                ownerCmds.push(deepScrub({ ...orgcmd }));
            ownerCmds = ownerCmds.filter(c => c.ownerOnly || (c.subcommands?.size ?? 0) != 0).map(c => CommandManager.ICommandToAPICommand(c, false));
            
            await this.registerGlobally(normalCmds);
            console.log(`Registered ${normalCmds.length} commands globally`);
            await this.registerToGuilds(ownerCmds);
            console.log(`Registered ${ownerCmds.length} owner commands to guilds`);
        }
    }

    private async registerGlobally(cmds: RESTPostAPIApplicationCommandsJSONBody[]) {
        await this.rest.put(Routes.applicationCommands(this.bot.application!.id), { body: cmds });
    }

    private async registerToGuilds(cmds: RESTPostAPIApplicationCommandsJSONBody[], guilds = CommandManager.ownerOnlyAndDebugCommandGuilds) {
        for(const guild of guilds)
            await this.rest.put(Routes.applicationGuildCommands(this.bot.application!.id, guild), { body: cmds });
    }

    static ICommandToAPICommand(cmd: ICommand, ignoreowner = true) {
        let slash: RESTPostAPIApplicationCommandsJSONBody = {
            name: cmd.name,
            type: ApplicationCommandType.ChatInput,
            description: cmd.description,
            dm_permission: !cmd.notdm        
        };

        if(cmd.permissions)
            slash.default_member_permissions = new PermissionsBitField(cmd.permissions).bitfield.toString();

        slash.options = cmd.subcommandGroup ? [...new Set([...cmd.subcommands!.values()])].filter(c => !c.deprecated && (!ignoreowner || ignoreowner && !c.ownerOnly)).map(c => {
            if(c.subcommandGroup) {
                if(c.subcommands!.some(c => !!c.subcommandGroup))
                    throw Error(`Subcommand nesting too deep in ${cmd.name} ${c.name}`);
                return { type: ApplicationCommandOptionType.SubcommandGroup, name: c.name, description: c.description, 
                         options: [...new Set([...c.subcommands!.values()])].filter(c => !c.deprecated && (!ignoreowner || ignoreowner && !c.ownerOnly)).map(c => ({ type: ApplicationCommandOptionType.Subcommand, name: c.name, description: c.description, options: c.options })) };
            }
            else return { type: ApplicationCommandOptionType.Subcommand, name: c.name, description: c.description, options: c.options };
        }) : cmd.options;

        return slash;
    }
}