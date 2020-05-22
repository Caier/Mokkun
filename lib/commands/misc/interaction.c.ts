import { group, aliases, register, CmdParams as c } from "../../util/cmdUtils";
import Utils from "../../util/utils";

export = H;

@group('Interakcja')
class H {
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
        args = bot.newArgs(msg, {splitter: '|'});
        msg.channel.send(H.choosePhrase(`**${args[Utils.rand(1, args.length - 1)]}**`, H.selPhrases as any));
    }
}