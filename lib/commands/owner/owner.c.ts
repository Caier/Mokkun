import { group, ownerOnly, register, CmdParams as c, options, subcommandGroup, aliases, notdm } from "../../util/commands/cmdUtils";
import util from 'util';
import Context from "../../util/commands/Context";
import { Formatters, Presence } from "discord.js";

//useful imports for .eval
import fs from 'fs-extra';
import path from 'path';
import ax from 'axios';
import Utils from '../../util/utils';
import files from "../../util/misc/files";
import { DB } from '../../mokkun';
import cp from 'child_process';
const imports = {fs, path, ax, Utils, files, DB, cp};
const decls = Object.keys(imports).reduce((p, c) => p + `var ${c} = imports["${c}"]; `, '');
//

@ownerOnly
@group("BotOwner")
export default class H {
    @register('bakes cookies', '', { free: 0 })
    @options({ type: "STRING", name: 'expression', description: 'nothing to see here', required: true })
    static async eval(ctx: Context) {
        await ctx.deferReply();
        try {
            let resp = await eval(`(async () => { ${decls} ${ctx.args[0]} })`)();
            await ctx.followUp(Formatters.codeBlock('js', util.inspect(resp, false, 1).slice(0, 1990)));
        } catch(err) {
            await ctx.followUp(Formatters.codeBlock('js', util.inspect(err, false, 1).slice(0, 1990)));
        }
    }

    @register('updates the bot somehow...', '')
    static async update(ctx: Context) {
        await ctx.reply({ embeds: [ctx.emb('**Aktualizowanie... (Obserwuj status)**')] });
        ctx.bot.user.setActivity("Aktualizowanie...", { type: 'PLAYING' });
        cp.exec('../updMokk.sh', (err, stdout, stderr) => {
            if (err || stderr)
                console.error(err || stderr);
        });
    }
}

@subcommandGroup("changes the bot's status and activity", H)
class presence {
    @register("changes bot's activity", '', { free: 1 })
    @aliases('a')
    @options({ type: 'STRING', name: 'type', description: 'activity type', choices: ['PLAYING', 'WATCHING', 'LISTENING', 'STREAMING', 'COMPETING'].map(s => ({ name: s, value: s })), required: true },
             { type: 'STRING', name: 'value', description: 'activity value', required: true })
    static async activity(ctx: Context) {
        ctx.bot.db.save('System.presence.activity', { name: ctx.args[1], type: ctx.args[0] });
        ctx.bot.user.setActivity(ctx.args[1], { type: ctx.args[0] });
        await ctx.reply({ embeds: [ctx.emb('Changed activity')] });
    }

    @register("changes bot's status", '')
    @aliases('s')
    @options({ type: "STRING", name: 'status', description: 'status value', choices: [{ name: 'online', value: 'online' }, { name: 'idle', value: 'idle' }, { name: 'invinsible', value: 'invinsible' }, { name: 'do not disturb', value: 'dnd' }], required: true })
    static async status(ctx: Context) {
        ctx.bot.db.save('System.presence.status', ctx.args[0]);
        ctx.bot.user.setStatus(ctx.args[0]);
        await ctx.reply({ embeds: [ctx.emb('Changed status')] });
    }
}