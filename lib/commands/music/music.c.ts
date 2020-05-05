import { group, CmdParams as c, notdm, register, extend, aliases } from "../../util/cmdUtils";
import { SafeEmbed } from "../../util/embed/SafeEmbed";
import { MusicQueue } from "../../util/music/MusicQueue";
import { TextChannel } from "discord.js";
import yts from '@caier/yts';
import sc from '@caier/sc';
import { MusicEntry } from "../../util/music/MusicEntry";
import { TrackEntry } from "@caier/sc/out/interfaces";
import { VideoEntry } from "@caier/yts/lib/interfaces";
import { SilentError } from "../../util/errors/errors";

@notdm
@extend(H.modify)
@group("Muzyka")
class H {
    static modify(msg: c.m, args: c.a, bot: c.b) {
        return [msg, bot.newArgs(msg, {freeargs: 1}), bot, 
                bot.music.getQueue(msg.guild).setOutChan(msg.channel as TextChannel)];
    }

    static embColor = [112, 0, 55];
    static scColor = '#ff8800';
    static emb = (desc?: string, sc?: boolean) => new SafeEmbed().setColor(sc ? H.scColor : H.embColor as any).setAuthor(desc || 'null');
    static gArgs = (msg: c.m, bot: c.b) => bot.newArgs(msg, {freeargs: 1});
    static whatToPlay = (msg: c.m, m?: string) => msg.channel.send(H.emb(m || "Co mam odtworzyć?"));
    static notFound = (msg: c.m) => H.whatToPlay(msg, "Nie znaleziono");
    static whatToSearch = (msg: c.m) => H.whatToPlay(msg, "Co chcesz wyszukać?");

    static async assertVC(msg: c.m) {
        if(!msg?.member?.voice?.channel) {
            msg.channel.send(H.emb('Aby korzystać z funkcji muzycznych, wejdź na kanał głosowy'));
            throw new SilentError("Member not in VC");
        }
        return await msg.member.voice.channel.join();
    }

    @register('dodaje do kolejki (z YT) lub wznawia odtwarzanie kolejki', '`$pplay (co odtworzyć)')
    static async play(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue, top = false, fromSC = false) {
        let VC = await H.assertVC(msg);
        if(!args[1] && queue?.playing?.dispatcher?.paused) {
            queue.resume();
            msg.channel.send(H.emb('Wznowiono odtwarzanie ⏯'));
            return;
        }
        else if(!args[1]) {
            H.whatToPlay(msg);
            return;
        }
        let vid = !fromSC ? (await yts(args[1]))?.videos?.[0] : (await sc.search(args[1]))?.tracks?.[0];
        if(!vid) {
            H.notFound(msg);
            return;
        }
        queue.addEntry(new MusicEntry({vid: vid, member: msg.member, queue: queue, type: fromSC ? 'sc' : 'yt'}), VC, top);
    }

    @aliases('top')
    @register('dodaje na górę kolejki (z YT)', '`$pplaytop {co odtworzyć}`')
    static playtop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        H.play(msg, args, bot, queue, true);
    }

    @aliases('sc')
    @register('dodaje do kolejki (z SoundCloud)', '`$psoundcloud {co odtworzyć}`')
    static soundcloud(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        H.play(msg, args, bot, queue, false, true);
    }

    @aliases('sctop')
    @register('dodaje na górę kolejki (z SoundCloud)', '`$psoundcloudtop {co odtworzyć}`')
    static soundcloudtop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        H.play(msg, args, bot, queue, true, true);
    }

    @aliases('sea')
    @register('dodaje do kolejki wybór z listy', '`$psearch {wyszukanie}`')
    static async search(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue, top = false, fromSC = false) {
        if(!args[1]) {
            H.whatToSearch(msg);
            return;
        }
        let VC = await H.assertVC(msg);
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

            bot.on("message", eventL = async (rmsg: c.m) => {
                if(rmsg.author.id != msg.author.id || rmsg.channel.id != msg.channel.id) return;

                if(entries[+rmsg.content - 1]) {
                    queue.addEntry(new MusicEntry({vid: entries[+rmsg.content - 1], member: msg.member, queue: queue, type: fromSC ? "sc" : "yt"}), VC, top);
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
    static searchtop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        H.search(msg, args, bot, queue, true, false);
    }

    @aliases('seasc')
    @register('dodaje do kolejki wybór z listy (z SoundCloud)', '`$psearchsc {wyszukanie}`')
    static searchsc(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        H.search(msg, args, bot, queue, false, true);
    }

    @aliases('seasctop')
    @register('dodaje na górę kolejki wybór z listy (z SoundCloud)', '`$psearchsctop {wyszukanie}`')
    static searchsctop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        H.search(msg, args, bot, queue, true, true);
    }

    @register('przechodzi do następnego utworu', '`$pskip (ile skipnąć)`')
    static skip(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        H.assertVC(msg);
        for(let i = 0; i < +args[1] || 1; i++)
            if(queue.playing) {
                msg.channel.send(H.emb('Skipped ⏩'));
                queue.playNext();
            } 
            else {
                msg.channel.send(H.emb('Nie ma czego skipować!'));
                break;
            }
    }

    @register('wstrzymuje kolejkę', '`$ppause`')
    static pause(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        H.assertVC(msg);
        if(queue.playing) {
            queue.pause();
            msg.channel.send(H.emb('Zapauzowano ⏸'));
        } else
            msg.channel.send(H.emb('Nie ma czego pauzować!'));
    }

    @aliases('rem')
    @register('usuwa wybrane utwory z kolejki', '`$premove {pozycja w kolejce, lub wiele pozycji w formacie [poz1, poz2, ...], lub "all" aby usunąć wszystkie}`')
    static async remove(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.assertVC(msg);
        if(!args[1]) return;
        args = bot.newArgs(msg, {arrayExpected: true});
        if(typeof args[1] == 'string') args[1] = [args[1]];
        let wrong = queue.remove(args[1]);
        wrong.length && msg.channel.send(H.emb('Podano błędną pozycję: ' + wrong.join(', ')));
    }

    @register('wyświetla kolejkę', '`$pqueue`')
    static queue(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        if(queue.queue.length > 0 || queue.playing) {
            let emb = new bot.RichEmbed().setColor(H.embColor as any).setAuthor("Kolejka");
            if(queue.playing)
                emb.addField("Teraz odtwarzane:", `${queue.playing.dispatcher.paused ? '⏸' : '▶️'} **${queue.playing.videoInfo.name}**` + '\n' + 'Pozostało: ' + queue.playing.timeLeft);
            if(queue.queue.length > 0) {
                emb.addField('\u200b', '**Następnie:**');
                let inc = 1;
                for(let x of queue.queue) {
                    emb.addField(`${inc++}.`, x.videoInfo.name);
                }
            }
            msg.channel.send(emb);
        }
        else
            msg.channel.send(H.emb('Kolejka jest pusta'));
    }

    @register('wyświetla bieżący utwór', '`$pnow`')
    static now(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        if(queue.playing) {
            let emb = (<SafeEmbed> queue.announce('nextSong', queue.playing, true)).setAuthor('Teraz odtwarzane')
            .spliceFields(-1, 0, [{name: 'Pozostało', value: queue.playing.timeLeft, inline: true},
            {name: 'Stan', value: queue.playing.dispatcher.paused ? '⏸' : '▶️', inline: true}]);
            msg.channel.send(emb);
        }
        else
            msg.channel.send(H.emb('Nic nie jest odtwarzane'));
    }

    @aliases('dq')
    @register('niszczy kolejkę i każdą jej właściwość', '`$pdestroyQueue`')
    static destroyQueue(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        bot.music.destroyQueue(msg.guild);
        msg.channel.send(H.emb('Zniszczono kolejkę'));
    }
}

export = H;