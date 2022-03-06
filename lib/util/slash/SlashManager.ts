import { REST } from "@discordjs/rest";
import { APIApplicationCommand, Routes } from "discord-api-types/v9";
import { Mokkun } from "../../mokkun";
import { ICommand } from "../commands/ICommand";

const ApplicationCommandOptionTypes = {
    SUB_COMMAND: 1,
    SUB_COMMAND_GROUP: 2,
    STRING: 3,
    INTEGER: 4,
    BOOLEAN: 5,
    USER: 6,
    CHANNEL: 7,
    ROLE: 8,
    MENTIONABLE: 9,
    NUMBER: 10,
}

export default class SlashManager {
    private rest = new REST({ version: '9' }).setToken(process.env.TOKEN);
    private ownerOverwrites = ['752199572830552104', '427235931796537374'];

    constructor(private bot: Mokkun) {}

    async register() {
        let uniqueCmds = [...new Set([...this.bot.commands.values()])].filter(c => !c.deprecated).map(c => this.cmdToSlashCmd(c));
        let registered = await this.rest.put(Routes.applicationGuildCommands(this.bot.application.id, '752199572830552104'), { body: uniqueCmds }) as APIApplicationCommand[];
        let toOverwrite = uniqueCmds.filter(c => !c.default_permission).map(c => ({ id: registered.find(ac => ac.name == c.name).id, permissions: [{ type: 2, id: process.env.BOT_OWNER, permission: true }]}));
        for(let guild of this.ownerOverwrites) {
            let cmds = await (await this.bot.guilds.fetch(guild)).commands.fetch();
            if(toOverwrite.every(p => cmds.has(p.id)))
                await this.rest.put(Routes.guildApplicationCommandsPermissions(this.bot.application.id, guild), { body: toOverwrite });
        }
        console.log('successfully registered commands');
    }

    private cmdToSlashCmd(cmd: ICommand) {
        let slash = {
            name: cmd.name,
            type: 1,
            description: cmd.description, 
            default_permission: !cmd.ownerOnly
        } as APIApplicationCommand;

        if(cmd.subcommandGroup)
            slash.options = [...new Set([...cmd.subcommands.values()])].filter(c => !c.subcommandGroup).map(s => ({ name: s.name, description: s.description, type: 1, options: s.options?.map(o => this.appOptionToAPIOption(o)) }));
        else 
            slash.options = cmd.options?.map(o => this.appOptionToAPIOption(o));
        
        return slash;
    }

    private appOptionToAPIOption(option: ICommand['options'][0]) {
        return {
            //@ts-ignore
            min_value: option.minValue, max_value: option.maxValue, choices: option.choices,
            name: option.name,
            description: option.description,
            required: option.required,
            autocomplete: option.autocomplete,
            type: typeof option.type == 'string' ? ApplicationCommandOptionTypes[option.type] : option.type
        }
    }
}