import { group, ownerOnly, register, CmdParams as c, options, subcommandGroup, aliases, notdm } from "../../util/commands/CommandDecorators.js";
import util from 'util';
import Context from "../../util/commands/Context.js";
import { ActivityType, ApplicationCommandOptionType, codeBlock, Formatters, Presence } from "discord.js";
import { CommandGroup } from "../../util/commands/ICommand.js";

//useful imports for .eval
import fs from 'fs-extra';
import path from 'path';
import ax from 'axios';
import Utils from '../../util/utils.js';
import files from "../../util/misc/files.js";
import cp from 'child_process';
import SafeEmbed from "../../util/embed/SafeEmbed.js";
const imports = {fs, path, ax, Utils, files, cp, SafeEmbed};
const decls = Object.keys(imports).reduce((p, c) => p + `var ${c} = imports["${c}"]; `, '');
//

@ownerOnly
@group(CommandGroup.Owner)
export default class H {
    @register('bakes cookies', '', { free: 0 })
    @options({ type: ApplicationCommandOptionType.String, name: 'expression', description: 'nothing to see here', required: true })
    static async eval(ctx: Context) {
        await ctx.deferReply();
        try {
            let resp = await eval(`(async () => { ${decls} ${ctx.args[0]} })`)();
            await ctx.followUp(codeBlock('js', util.inspect(resp, false, 1).slice(0, 1990)));
        } catch(err) {
            await ctx.followUp(codeBlock('js', util.inspect(err, false, 1).slice(0, 1990)));
        }
    }

    @register('updates the bot somehow...', '')
    static async update(ctx: Context) {
        await ctx.reply({ embeds: [SafeEmbed.quick('**Aktualizowanie... (Obserwuj status)**')] });
        ctx.bot.user!.setActivity("Aktualizowanie...", { type: ActivityType.Playing });
        cp.exec('../updMokk.sh', (err, stdout, stderr) => {
            if (err || stderr)
                console.error(err || stderr);
        });
    }

    @register('unregister all application commands', '')
    static async unregister(ctx: Context) {
        await ctx.deferReply();
        await ctx.bot.commands.unregisterAll();
        await ctx.followUp({ embeds: [SafeEmbed.quick('Successfully unregistered application commands')] });
    }
}

@subcommandGroup("changes the bot's status and activity", H)
class presence {
    @register("changes bot's activity", '', { free: 1 })
    @aliases('a')
    @options({ type: ApplicationCommandOptionType.String, name: 'type', description: 'activity type', choices: ['Playing', 'Streaming', 'Listening', 'Watching', 'Competing'].map(s => ({ name: s, value: s })), required: true },
             { type: ApplicationCommandOptionType.String, name: 'value', description: 'activity value', required: true })
    static async activity(ctx: Context) {
        ctx.bot.db.save('System.presence.activity', { name: ctx.args[1], type: ActivityType[ctx.args[0]] });
        ctx.bot.user!.setActivity(ctx.args[1], { type: ActivityType[ctx.args[0] as Exclude<keyof typeof ActivityType, 'Custom'>] });
        await ctx.reply({ embeds: [SafeEmbed.quick('Changed activity')] });
    }

    @register("changes bot's status", '')
    @aliases('s')
    @options({ type: ApplicationCommandOptionType.String, name: 'status', description: 'status value', choices: [{ name: 'online', value: 'online' }, { name: 'idle', value: 'idle' }, { name: 'invinsible', value: 'invinsible' }, { name: 'do not disturb', value: 'dnd' }], required: true })
    static async status(ctx: Context) {
        ctx.bot.db.save('System.presence.status', ctx.args[0]);
        ctx.bot.user!.setStatus(ctx.args[0]);
        await ctx.reply({ embeds: [SafeEmbed.quick('Changed status')] });
    }
}