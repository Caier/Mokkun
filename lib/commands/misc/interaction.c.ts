import { group, aliases, register, CmdParams as c } from "../../util/cmdUtils";
import Utils from "../../util/utils";

@group('Interakcja')
export default class H {
    private static selPhrases = [[1, '| to najlepszy wybór!'], [1, 'Wybieram |'], [0.7, '| brzmi nieźle!'], [0.7, 'Oczywiście, że |'], [0.5, 'Hmm..., |'], [0.3, 'Osobiście wybrałbym |, ale nie mam pewności...']];
    private static choosePhrase(choice: string, from: [number, string][]) {
        let luck = Math.random();
        let filCh = from.filter(v => v[0] >= luck);
        return filCh[Utils.rand(0, filCh.length - 1)][1].replace('|', choice);
    }

    @aliases('select', 'sel', 'ch')
    @register('wybiera jedną z podanych możliwości', '`$pchoose {wybory oddzielone symbolem |}`')
    static choose(msg: c.m, args: c.a, bot: c.b) {
        if(!args[1]) {
            bot.sendHelp(msg, 'choose');
            return;
        }
        args = bot.newArgs(msg, {splitter: '|', freeargs: 1});
        Utils.send(msg.channel, H.choosePhrase(`**${args[Utils.rand(1, args.length - 1)]}**`, H.selPhrases as any));
    }

    @register('losuje numer spośród podanego zakresu :cowboy:', '`$proll (minimum) {maksimum}`')
    static roll(msg: c.m, args: c.a, bot: c.b) {
        const fi = args.length == 3;
        if(!args.slice(1).every(v => !isNaN(+v)) || args.length == 1 || (fi && args[2] < args[1]) || (!fi && args[1] < 1)) {
            bot.sendHelp(msg, 'roll');
            return;
        }
        Utils.send(msg.channel, `**${msg.author.username}** losuje numer z zakresu **${fi ? args[1] : 1}** - **${fi ? args[2] : args[1]}**...\nWylosowano: **${Utils.rand(fi ? +args[1] : 1, fi ? +args[2] : +args[1])}**`);
    }
}