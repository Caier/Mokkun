import { group, ownerOnly, register, CmdParams as c } from "../../util/cmdUtils";

//useful imports for .eval
import fs from 'fs-extra';
import path from 'path';
import ax from 'axios';
import Utils from '../../util/utils';
import cp from 'child_process';

@ownerOnly
@group("Bot owner")
class Handler {
    @register('ewaluacja wyrażeń', '`$peval {wyrażenie w JS}`')
    static eval(msg: c.m, args: c.a, bot: c.b) {
        const print = (cont: any, opts?: any) => msg.channel.send(cont, opts);

        let code = msg.content.slice(msg.prefix.length + this.name.length);
        try {
            eval(code);
        } catch(err) {
            msg.channel.send('Nastąpił błąd podczas ewaluacji wyrażenia:\n\n' + err.stack.split('\n').slice(0, 5).join('\n'), {split: true, code: true});
        }
    }

    @register('zmienia status bota', '`$pstatus {typ aktywności} {status}` - zmienia status (presence) bota')
    static status(msg: c.m, args: c.a, bot: c.b) {
        args = bot.getArgs(msg.content, msg.prefix, "|", 2);
        let acceptable = ["PLAYING", "STREAMING", "LISTENING", "WATCHING"];

        if(args[1] && args[2])
        {
            args[1] = args[1].toUpperCase();
            if(acceptable.includes(args[1]))
            {
                bot.db.save(`System.presence`, {name: args[2], type: args[1]});
                bot.user.setActivity(args[2], {type: args[1]})
                .then(() => msg.channel.send(bot.embgen(bot.sysColor, "Ustawiono status")));
            }
            else msg.channel.send(bot.embgen(bot.sysColor, `Dostępne typy statusu:\n${acceptable.join("\n")}`));
        }
    }

    @register('aktualizuje bota', '`$pupdate`')
    static update(msg: c.m, args: c.a, bot: c.b) {
        cp.exec('../updMokk.sh', (err, stdout) => {
            if (err)
                throw err;
            msg.channel.send(stdout, {split: true, code: true});
        });
    }
}

export = Handler;