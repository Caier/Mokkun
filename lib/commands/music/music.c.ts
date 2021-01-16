import { group, CmdParams as c, notdm, register, extend, aliases, deprecated, subcommandGroup } from "../../util/cmdUtils";
import { SafeEmbed } from "../../util/embed/SafeEmbed";
import { MusicQueue } from "../../util/music/MusicQueue";
import { Message, TextChannel } from "discord.js";
import yts from '@caier/yts';
import sc from '@caier/sc';
import { MusicEntry } from "../../util/music/MusicEntry";
import { TrackEntry } from "@caier/sc/lib/interfaces";
import { VideoEntry } from "@caier/yts/lib/interfaces";
import { LoggedError, SilentError } from "../../util/errors/errors";
import Utils from "../../util/utils";
import { Playlist } from "../../util/music/Playlist";
import Playspace from "../../util/music/Playspace";
import { ICommand } from "../../util/interfaces/ICommand";

@notdm
@extend((m: c.m, [], b: c.b, c: ICommand) => {
    let queue = b.music.getQueue(m.guild).setOutChan(m.channel as TextChannel);
    let unprohibited = ['queue', 'now', 'his'].map(c => b.commands.get(c));
    if(!unprohibited.includes(c) && !queue.playspaceManager.current.isPublic && !queue.playspaceManager.current.moderators.includes(m.member.id)) {
        m.channel.send(H.emb("Nie jesteś moderatorem tej przestrzeni odtwarzania").setDescription("Aby zmienić przestrzeń na domyślną użyj komendy `playspace switch`"));
        throw new SilentError();
    }
    return [m, b.newArgs(m, {freeargs: 1}), b, queue];
})
@group("Muzyka")
export default class H {
    static embColor = [112, 0, 55];
    static scColor = '#ff8800';
    static emb = (desc?: string, sc?: boolean) => new SafeEmbed().setColor(sc ? H.scColor : H.embColor as any).setAuthor(desc || 'null');
    static gArgs = (msg: c.m, bot: c.b) => bot.newArgs(msg, {freeargs: 1});
    static whatToPlay = (msg: c.m, m?: string) => msg.channel.send(H.emb(m || "Co mam odtworzyć?"));
    static notFound = (msg: c.m) => H.whatToPlay(msg, "Nie znaleziono");
    static whatToSearch = (msg: c.m) => H.whatToPlay(msg, "Co chcesz wyszukać?");

    static async assertVC(msg: c.m, queue?: MusicQueue) {
        if(!msg?.member?.voice?.channel) {
            msg.channel.send(H.emb('Aby korzystać z funkcji muzycznych, wejdź na kanał głosowy'));
            throw new SilentError("Member not in VC");
        }
        if(queue)
            queue.setVC(await msg.member.voice.channel.join());
    }

    @register('dodaje do kolejki (z YT) lub wznawia odtwarzanie kolejki', '`$pplay (co odtworzyć)')
    static async play(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue, top = false, fromSC = false) {
        await H.assertVC(msg, queue);
        if(!args[1] && queue?.playing?.dispatcher?.paused) {
            queue.resume();
            msg.channel.send(H.emb('Wznowiono odtwarzanie ⏯'));
            return;
        }
        else if(!args[1] && queue.queue.length == 0) {
            H.whatToPlay(msg);
            return;
        }
        else if(!args[1]) 
            return;

        if(/[?&]list=([^#\&\?]+)/.test(args[1])) {
            let vids = (await Playlist.fromYTlist(args[1], msg.author.username)).showEntries();
            if(!vids.length) {
                H.whatToPlay(msg, 'Ta playlista jest pusta');
                return;
            }
            queue.addEntry(vids, top);
        }
        else {
            let vid = !fromSC ? (await yts(args[1]))?.videos?.[0] : (await sc.search(args[1]))?.tracks?.[0];
            if(!vid) {
                H.notFound(msg);
                return;
            }
            queue.addEntry(new MusicEntry({vid: vid, by: msg.author.username, type: fromSC ? 'sc' : 'yt'}), top);
        }
    }

    @aliases('top')
    @register('dodaje na górę kolejki (z YT)', '`$pplaytop {co odtworzyć}`')
    static async playtop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.play(msg, args, bot, queue, true);
    }

    @aliases('sc')
    @register('dodaje do kolejki (z SoundCloud)', '`$psoundcloud {co odtworzyć}`')
    static async soundcloud(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.play(msg, args, bot, queue, false, true);
    }

    @aliases('sctop')
    @register('dodaje na górę kolejki (z SoundCloud)', '`$psoundcloudtop {co odtworzyć}`')
    static async soundcloudtop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.play(msg, args, bot, queue, true, true);
    }

    @aliases('sea')
    @register('dodaje do kolejki wybór z listy', '`$psearch {wyszukanie}`')
    static async search(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue, top = false, fromSC = false) {
        if(!args[1]) {
            H.whatToSearch(msg);
            return;
        }
        await H.assertVC(msg, queue);
        let embed = new bot.RichEmbed().setColor(fromSC ? H.scColor : H.embColor as any).setAuthor("Wyszukanie 🔍").setDescription('\u200b');
        let entries = fromSC ? (await sc.search(args[1]))?.tracks : (await yts(args[1]))?.videos;
        if(!entries || entries?.length == 0) {
            H.notFound(msg);
            return;
        }
        entries.forEach((vid: TrackEntry | VideoEntry, i: number) => {
            embed.addField(`**Kanał: ${vid.author.name}**`, `**\`${i+1}.\` ${vid.name}**\nDługość: ${vid.duration}`);
        });
        msg.channel.send(embed).then(async nmsg => {
            let imsg = await msg.channel.send(H.emb("Napisz numer utworu, który chcesz puścić, lub odpisz `stop` aby anulować wyszukanie", fromSC));
            let eventL: any;
            setTimeout(() => bot.removeListener("message", eventL), 120000);

            bot.on("message", eventL = async (rmsg: Message) => {
                if(rmsg.author.id != msg.author.id || rmsg.channel.id != msg.channel.id) return;

                if(entries[+rmsg.content - 1]) {
                    queue.addEntry(new MusicEntry({vid: entries[+rmsg.content - 1], by: msg.author.username, queue: queue, type: fromSC ? "sc" : "yt"}), top);
                    rmsg.content = "stop";
                }
                if(rmsg.content == 'stop') {
                    msg.delete({timeout: 150});
                    nmsg.delete({timeout: 150});
                    rmsg.delete({timeout: 150});
                    imsg.delete({timeout: 150});
                    bot.removeListener("message", eventL);
                }
            });
        });
    }

    @aliases('seatop')
    @register('dodaje na górę kolejki wybór z listy', `$psearchtop {wyszukanie}`)
    static async searchtop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.search(msg, args, bot, queue, true, false);
    }

    @aliases('seasc')
    @register('dodaje do kolejki wybór z listy (z SoundCloud)', '`$psearchsc {wyszukanie}`')
    static async searchsc(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.search(msg, args, bot, queue, false, true);
    }

    @aliases('seasctop')
    @register('dodaje na górę kolejki wybór z listy (z SoundCloud)', '`$psearchsctop {wyszukanie}`')
    static async searchsctop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.search(msg, args, bot, queue, true, true);
    }

    @register('przechodzi do następnego utworu', '`$pskip (ile skipnąć)`')
    static async skip(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.assertVC(msg);
        if(!queue.playing) {
            msg.channel.send(H.emb('Nie ma czego skipować!'));
            return;
        }
        if(queue.loop)
            queue.loop = 0;
        if(args[1] && !isNaN(+args[1]) && +args[1] > 0)
            queue.queue.splice(0, (+args[1] >= queue.queue.length) ? queue.queue.length - 1 : +args[1]);
        msg.channel.send(H.emb('Skipped ⏩'));
        queue.playNext();
    }

    @register('wstrzymuje kolejkę', '`$ppause`')
    static async pause(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.assertVC(msg);
        if(queue.playing) {
            queue.pause();
            msg.channel.send(H.emb('Zapauzowano ⏸'));
        } else
            msg.channel.send(H.emb('Nie ma czego pauzować!'));
    }

    @aliases('rem')
    @register('usuwa wybrane utwory z kolejki', '`$premove {pozycja w kolejce, lub wiele pozycji oddzielonych spacją, lub "all" aby usunąć wszystkie}`')
    static async remove(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.assertVC(msg);
        if(!args[1]) return;
        args = bot.newArgs(msg);
        args[1] = args.slice(1);
        let wrong = queue.remove(args[1]);
        wrong.length && msg.channel.send(H.emb('Podano błędną pozycję: ' + wrong.join(', ')));
    }

    @register('wyświetla kolejkę', '`$pqueue`')
    static queue(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        if(queue.queue.length > 0 || queue.playing) {
            let emb = new bot.RichEmbed().setColor(H.embColor as any).setAuthor("Kolejka").addField("Przestrzeń odtwarzania", queue.playspaceManager.current.name);
            if(queue.playing)
                emb.addField("Teraz odtwarzane:", `${queue.playing.dispatcher.paused ? '⏸' : '▶️'} [**${queue.playing.videoInfo.name}**](${queue.playing.videoInfo.url})` + '\n' + 'Pozostało: ' + queue.playing.timeLeft);
            if(queue.queue.length > 0) {
                emb.addField('\u200b', '**Następnie:**');
                queue.queue.forEach((x, i) =>
                    emb.addField(`Kanał: ${x.videoInfo.author.name}`, `${++i}. [${x.videoInfo.name}](${x.videoInfo.url})`));
                let embs = emb.populateEmbeds();
                if(embs.length > 0)
                    Utils.createPageSelector(msg.channel as TextChannel, embs, {triggers: [msg.author.id]});
                else
                    msg.channel.send(emb);
            } else msg.channel.send(emb);
        }
        else
            msg.channel.send(H.emb('Kolejka jest pusta'));
    }

    @register('wyświetla bieżący utwór', '`$pnow`')
    static now(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        if(queue.playing) {
            let emb = (<SafeEmbed> queue.announce('nextSong', queue.playing, true)).setAuthor('Teraz odtwarzane')
            .spliceFields(-1, 0, [{name: 'Pozostało', value: queue.playing.timeLeft + (queue.loop ? ` + ${queue.loop} powtórzeń` : ''), inline: true},
            {name: 'Stan', value: queue.playing.dispatcher.paused ? '⏸' : '▶️', inline: true},
            {name: 'Przestrzeń', value: queue.playspaceManager.current.name, inline: true}]);
            msg.channel.send(emb);
        }
        else
            msg.channel.send(H.emb('Nic nie jest odtwarzane'));
    }

    @aliases('dq')
    @register('niszczy kolejkę i każdą jej właściwość', '`$pdestroyQueue`')
    static async destroyQueue(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        let conf = await Utils.confirmBox(msg.channel as any, "Ta komenda wyczyści wszyskie właściwości kolejki, jej historię, ustawienia, playlisty itd.\nJeśli chcesz jedynie zatrzymać odtwarzanie, użyj komendy `pause` lub `stop`\n\nCzy na pewno chcesz zniszczyć kolejkę tego serwera?", msg.author);
        if(conf) {
            bot.music.destroyQueue(msg.guild);
            msg.channel.send(H.emb('Zniszczono kolejkę'));
        }
    }

    @register('zatrzymuje odtwarzanie po skończeniu obecnego utworu i rozłącza bota', '$pstop')
    static stop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        msg.channel.send(H.emb(queue.softStop() ? 'Zatrzymanie kolejki nastąpi po skończeniu utworu ⏹' : 'Zatrzymano kolejkę ⏹'));
    }

    @aliases('fstop')
    @register('zatrzymuje odtwarzanie i rozłącza bota', '$c')
    static forcestop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        queue.stop();
        msg.channel.send(H.emb('Zatrzymano kolejkę ⏹'));
    }

    @aliases('his')
    @register('wyświetla historię odtwarzania serwera', '`$phistory`')
    static history(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        if(queue?.history?.length == 0)
            H.whatToPlay(msg, "Historia odtwarzania jest pusta!");
        else {
            let emb = new SafeEmbed().setColor(H.embColor as any).setAuthor("Historia");
            [...queue.history].reverse().forEach((v, i) => {
                emb.addField(`Kanał: **${v.videoInfo.author.name}**`, `${i+1}. **[${v.videoInfo.name}](${v.videoInfo.url})**`);
            });
            let embs = emb.populateEmbeds();
            if(embs.length > 0)
                Utils.createPageSelector(msg.channel as TextChannel, embs, {triggers: [msg.author.id]});
            else 
                msg.channel.send(emb);
        }
    }

    @aliases('clhis')
    @register('czyści historię odtwarzania', '`$pclearHistory`')
    static clearHistory(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        queue.history = [];
        msg.channel.send(H.emb('Wyczyszczono historię odtwarzania'));
    }

    @deprecated
    @aliases('aplay')
    @register('włącza/wyłącza autoodtwarzanie następnych utworów', '`$pautoplay`')
    static async autoplay(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        msg.channel.send(H.emb('Autoodtwarzanie nie jest obecnie wspierane'/* queue.toggleAutoplay() ? 'Włączono autoodtwarzanie' : 'Wyłączono autoodtwarzanie' */));
    }

    @register('losowo miesza utwory w kolejce', '`$pshuffle`')
    static shuffle(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        let q = Utils.arrayShuffle(queue.queue);
        queue.queue = q;
        queue.playspaceManager.current.queue = q;
        msg.channel.send(H.emb('Pomieszano utwory w kolejce'));
    }

    @register('powtarza odtwarzanie obecnego utworu', '`$c (ilość powtórzeń, w przypadku braku tego argumentu utwór powtarzany będzie w nieskończoność)`')
    static loop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        if(!queue.playing)
            throw new LoggedError(msg.channel, 'Nie ma czego powtarzać', H.embColor as any);
        if(!args[1] || !isNaN(+args[1]) && +args[1] > 0) {
            queue.loop = +args[1] || Infinity;
            msg.channel.send(H.emb(`Obecny utwór zostanie powtórzony ${+args[1] || 'nieskończoność'} razy.`));
        }
        else msg.channel.send(H.emb('Niepoprawna ilość powtórzeń'));
    }
}

@subcommandGroup('ponowne odtwarzanie piosenek z historii', H)
@aliases('rep')
@notdm
@extend(repeat.mod)
class repeat {
    static async mod(msg: c.m, args: c.a, bot: c.b) {
        let q = bot.music.getQueue(msg.guild).setOutChan(msg.channel as TextChannel);
        if(!q.playspaceManager.current.isPublic && !q.playspaceManager.current.moderators.includes(msg.member.id)) {
            msg.channel.send(H.emb("Nie jesteś moderatorem tej przestrzeni odtwarzania").setDescription("Aby zmienić przestrzeń na domyślną użyj komendy `playspace switch`"));
            throw new SilentError();
        }
        await H.assertVC(msg);
        if(!q.history?.length)
            throw new LoggedError(msg.channel, "Historia odtwarzania jest pusta!", H.embColor as any);
        await H.assertVC(msg, q);
        let already: string[] = [];
        let entries: MusicEntry[] = q.history.filter(v => 
            !already.includes(v.videoInfo.url) && already.push(v.videoInfo.url)     
        ).map(v => MusicEntry.fromJSON(v, msg.author.username));
        return [msg, args, bot, q, entries];
    }

    @aliases('rand', 'r')
    @register('odtwarza losowe piosenki z historii', '`$c (liczba piosenek)`')
    static random(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue, entries: MusicEntry[]) {
        queue.addEntry(Utils.arrayShuffle(entries).slice(0, !isNaN(+args[1]) && +args[1] || 1), false);
    }

    @aliases('a')
    @register('odtwarza wszystkie unikalne piosenki z historii', '`$c')
    static all(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue, entries: MusicEntry[]) {
        queue.addEntry(entries, false);
    }

    @register('odtwarza ostatnią lub wybrane piosenki z historii', '`$c (pozycje piosenek w historii np. 3 6 17...)`')
    static _(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        if(!args[0])
            queue.addEntry(MusicEntry.fromJSON(queue.history.slice(-1)[0], msg.author.username), false);
        else {
            let wrong = args.filter((v: string) => isNaN(+v) || ![...queue.history].reverse()[+v - 1]);
            args = args.filter((v: string) => !wrong.includes(v));
            let entries: MusicEntry[] = [];
            for(let entry of args) {
                let saved = [...queue.history].reverse()[+entry - 1];
                entries.push(MusicEntry.fromJSON(saved, msg.author.username));
            }
            queue.addEntry(entries, false);
            wrong.length > 0 && msg.channel.send(H.emb('Podano błędną pozycję: ' + wrong.join(', ')));
        }
    }
}

@subcommandGroup('przestrzenie odtwarzania', H)
@aliases('ps')
@notdm
@extend((m: c.m, a: c.a, b: c.b) => [m, a, b, b.music.getQueue(m.guild).setOutChan(m.channel as TextChannel)])
class playspace {
    @aliases('c')
    @register('tworzy nową przestrzeń odtwarzania', '`$c {nazwa przestrzeni} (oznaczenia moderatorów przestrzeni <domyślnie każdy>)')
    static create(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        if(!args[1])
            throw new LoggedError(msg.channel, "Podaj nazwę przestrzeni odtwarzania", H.embColor as any);
        if(queue.playspaceManager.spaces.find(ps => ps.name == args[1]))
            throw new LoggedError(msg.channel, "Ta przestrzeń odtwarzania już istnieje", H.embColor as any);

        let isPublic = false;
        let mods = [...new Set([...msg.mentions.members.keyArray(), ...msg.mentions.roles.array().map(r => r.members.keyArray()).flat()])];
        if(!mods.length)
            isPublic = true;
        queue.playspaceManager.spaces.push(new Playspace({name: args[1], author: msg.member.id, moderators: mods, isPublic}));
        queue.savePlayspaces();
        msg.channel.send(H.emb('Utworzono przestrzeń odtwarzania: ' + args[1]));
    }

    @aliases('r', 'rem')
    @register('usuwa przestrzeń odtwarzania', '`$c`')
    static remove(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        if(!args[1])
            throw new LoggedError(msg.channel, "Podaj nazwę przestrzeni odtwarzania", H.embColor as any);
        let ps = queue.playspaceManager.spaces.find(p => p.name == args[1]);
        if(!ps)
            throw new LoggedError(msg.channel, "Ta przestrzeń odtwarzania nie istnieje", H.embColor as any);
        if(!ps.isPublic && !ps.moderators.includes(msg.member.id))
            throw new LoggedError(msg.channel, "Nie jesteś moderatorem tej przestrzeni odtwarzania", H.embColor as any);
        if(ps.isDefault)
            throw new LoggedError(msg.channel, "Nie możesz usunąć domyślnej przestrzeni odtwarzania", H.embColor as any);

        msg.channel.send(H.emb('Usunięto przestrzeń odtwarzania: ' + args[1]));
        if(queue.playspaceManager.current == ps)
            queue.switchPlayspace('default');
        queue.playspaceManager.spaces = queue.playspaceManager.spaces.filter(s => s.name != ps.name);
        queue.savePlayspaces();
    }

    @aliases('sw')
    @register('zamienia obecną przestrzeń na wybraną', '`$c {nazwa przestrzeni}`')
    static switch(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        if(!args[1])
            args[1] = 'Default';
        let ps = queue.playspaceManager.spaces.find(p => p.name == args[1]);
        if(!ps)
            throw new LoggedError(msg.channel, "Ta przestrzeń odtwarzania nie istnieje", H.embColor as any);
        if(!ps.isPublic && !ps.moderators.includes(msg.member.id))
            throw new LoggedError(msg.channel, "Nie jesteś moderatorem tej przestrzeni odtwarzania", H.embColor as any);

        queue.switchPlayspace(ps);
        msg.channel.send(H.emb('Zmieniono przestrzeń odtwarzania na: ' + ps.name));
    }

    @register('wyświetla przestrzenie odtwarzania tego serwera', '`$c`')
    static list(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        let emb = H.emb('Lista przestrzeni odtwarzania').setDescription(queue.playspaceManager.spaces.map(s => s.name).join(', '));
        msg.channel.send(emb);
    }

    @register('wyświetla obecną przestrzen odtwarzania', '`$c`')
    static _(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        let ps = queue.playspaceManager.current;
        if(ps.isDefault) {
            msg.channel.send(H.emb('Ta przestrzeń odtwarzania jest domyślna'));
            return;
        }
        let emb = new bot.RichEmbed().setColor(H.embColor as any).setAuthor('Obecna przestrzeń odtwarzania').addField('Nazwa', ps.name)
            .addField('Twórca', msg.guild.members.resolve(ps.author)?.user.username)
            .addField('Publiczna?', ps.isPublic ? 'tak' : 'nie');
        !ps.isPublic && emb.addField('Moderatorzy', ps.moderators.map(m => msg.guild.members.resolve(m).user.username).join(', '));
        emb.addField('Długość kolejki', ps.queue.length).addField('Długość historii', ps.history.length);

        msg.channel.send(emb);
    }
}

//@subcommandGroup('komendy związane z playlistami', H)
// @aliases('plist')
// class playlist {
//     @aliases('c')
//     @register()
//     static create(msg: c.m, args: c.a, bot: c.b) {

//     }

//     @aliases('r', 'rem')
//     @register()
//     static remove(msg: c.m, args: c.a, bot: c.b) {

//     }

//     @aliases('u')
//     @register()
//     static update(msg: c.m, args: c.a, bot: c.b) {

//     }
// }