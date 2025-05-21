const { MusicEntry } = require('../util/music/out/MokkunMusic');

module.exports = {
    name: 'music',
    description: '',
    usage: '',
    aliases: ['play', 'skip', 'pause', 'remove', 'queue', 'now', 'playtop', 'sc', 'sctop'],
    notdm: true,
    async execute(msg, args, bot)
    {
        let embColor = [112, 0, 55];
        const emb = desc => new bot.RichEmbed().setColor(embColor).setAuthor(desc || '');

        if(!msg.member.voice.channel) {
            msg.channel.send(emb('Aby korzystać z funkcji muzycznych, wejdź na kanał głosowy'));
            return;
        }

        let queue = bot.music.getQueue(msg.guild).setOutChan(msg.channel);
        args = bot.getArgs(msg.content, msg.prefix, null, (args[0] == 'music') ? 2 : 1);
        if(args[0] == 'music') args.shift();
        
        if(args[0] == 'play' || args[0] == 'playtop') {
            if(!args[1] && queue.playing && queue.playing.dispatcher && queue.playing.dispatcher.paused) {
                queue.resume();
                msg.channel.send(emb('Wznowiono odtwarzanie ⏯'));
                return;
            }
            else if(!args[1]) {
                msg.channel.send(emb('Co mam odtworzyć?'));
                return;
            }
            let vid = (await bot.music.searchVideos(args[1])).videos;
            if(vid.length == 0) {
                msg.channel.send(emb('Nie znaleziono'));
                return;
            }
            queue.addEntry(new MusicEntry({vid: vid[0], member: msg.member, queue: queue, type: "yt"}), await msg.member.voice.channel.join(), args[0] == 'playtop');
        }

        else if(args[0] == 'sc' || args[0] == 'sctop') {
            if(!args[1]) {
                msg.channel.send(emb('Co mam odtworzyć?'));
                return;
            }
            let vid = (await bot.music.searchSC(args[1])).songs;
            if(vid.length == 0) {
                msg.channel.send(emb('Nie znaleziono'));
                return;
            }
            queue.addEntry(new MusicEntry({vid: vid[0], member: msg.member, queue: queue, type: "sc"}), await msg.member.voice.channel.join(), args[0] == 'sctop');
        }

        else if(args[0] == 'skip') {
            if(queue.playing) {
                msg.channel.send(emb('Skipped ⏩'));
                queue._playNext();
            } else
                msg.channel.send(emb('Nie ma czego skipować!'));
        }

        else if(args[0] == 'pause') {
            if(queue.playing) {
                queue.pause();
                msg.channel.send(emb('Zapauzowano ⏸'));
            } else
                msg.channel.send(emb('Nie ma czego pauzować!'));
        }

        else if(args[0] == 'remove' && args[1]) {
            if(!queue.remove(args[1]))
                msg.channel.send(emb('Podano błędną pozycję'));
        }

        else if(args[0] == 'queue') {
            if(queue.queue.length > 0 || queue.playing) {
                let emb = new bot.RichEmbed().setColor(embColor).setAuthor("Kolejka");
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
                msg.channel.send(emb('Kolejka jest pusta'))
        }

        else if(args[0] == 'now') {
            if(queue.playing) {
                let emb = queue._announce('nextSong', queue.playing, true).setAuthor('Teraz odtwarzane')
                .spliceFields(-1, 0, [{name: 'Pozostało', value: queue.playing.timeLeft, inline: true},
                {name: 'Stan', value: queue.playing.dispatcher.paused ? '⏸' : '▶️', inline: true}]);
                msg.channel.send(emb);
            }
            else
                msg.channel.send(emb('Nic nie jest odtwarzane'))
        }
    }
}