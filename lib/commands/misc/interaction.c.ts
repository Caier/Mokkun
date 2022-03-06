import { group, aliases, register, CmdParams as c, options } from "../../util/commands/cmdUtils";
import Context from "../../util/commands/Context";
import Utils from "../../util/utils";

const selPhrases: [number, string][] = [[1, '| to najlepszy wybór!'], [1, 'Wybieram |'], [0.7, '| brzmi nieźle!'], [0.7, 'Oczywiście, że |'], [0.5, 'Hmm..., |'], [0.3, 'Osobiście wybrałbym |, ale nie mam pewności...']];
function choosePhrase(choice: string, from: [number, string][]) {
    let luck = Math.random();
    let filCh = from.filter(v => v[0] >= luck);
    return filCh[Utils.rand(0, filCh.length - 1)][1].replace('|', choice);
}

@group('Interakcja')
export default class {
    @aliases('select', 'sel', 'ch')
    @register('chooses one of the provided choices', '', { free: 0 })
    @options({ type: 'STRING', name: 'options', description: 'the options to choose from separated by the | character', required: true })
    static async choose(ctx: Context) {
        const choices = (ctx.args[0] as string).split('|').map(c => c.trim());
        await ctx.reply(choosePhrase(`**${choices[Utils.rand(0, choices.length - 1)]}**`, selPhrases));
    }

    @register('roll a number between min and max (inclusive)', '')
    @options({ type: "INTEGER", name: 'max', description: 'the maximum roll', required: true },
             { type: "INTEGER", name: 'min', description: 'the minimum roll' })
    static async roll(ctx: Context) {
        const [min, max] = [ctx.options.get('min'), ctx.options.get('max')] as number[];
        await ctx.reply(`**${ctx.user.username}** losuje numer z zakresu **${min ?? 1}** - **${max}**...\nWylosowano: **${Utils.rand(min ?? 1, max)}**`);
    }
}