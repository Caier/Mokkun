const { MusicEntry } = require('../util/music/out/MokkunMusic');
const yts = require('@caier/yts');
const sc = require('@caier/sc');

module.exports = {
    name: 'music',
    description: '',
    usage: '',
    aliases: ['play', 'skip', 'pause', 'remove', 'queue', 'now', 'playtop', 'sc', 'sctop', 'search', 'searchsc', 'searchtop', 'searchsctop'],
    notdm: true,
    async execute(msg, args, bot)
    {
        const embColor = [112, 0, 55];
        const scColor = '#ff8800';
        const emb = desc => new bot.RichEmbed().setColor(embColor).setAuthor(desc || '');

        if(!msg.member.voice.channel) {
            msg.channel.send(emb('Aby korzystać z funkcji muzycznych, wejdź na kanał głosowy'));
            return;
        }

        let queue = bot.music.getQueue(msg.guild).setOutChan(msg.channel);
        args = bot.getArgs(msg.content, msg.prefix, null, (args[0] == 'music') ? 2 : 1);
        if(args[0] == 'music') args.shift();

        switch(args[0]) {
            case 'play' || 'playtop': {
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
            } break;

            case 'sc' || 'sctop': {
                if(!args[1]) {
                    msg.channel.send(emb('Co mam odtworzyć?'));
                    return;
                }
                let vid = (await bot.music.searchSC(args[1])).tracks;
                if(vid.length == 0) {
                    msg.channel.send(emb('Nie znaleziono'));
                    return;
                }
                queue.addEntry(new MusicEntry({vid: vid[0], member: msg.member, queue: queue, type: "sc"}), await msg.member.voice.channel.join(), args[0] == 'sctop');
            } break;

            case 'search': case 'searchtop': case 'searchsc': case 'searchsctop': {
                if(!args[1]) {
                    msg.channel.send(emb("Co chcesz wyszukać?"));
                    return;
                }
                const scRule = (args[0] == "searchsc" || args[0] == "searchsctop");
                let embed = new bot.RichEmbed().setColor(scRule ? scColor : embColor).setAuthor("Wyszukanie 🔍").setDescription('\u200b');
                let videos = scRule ? (await sc.search(args[1])).tracks : (await yts(args[1])).videos;
                
                if(videos == 0) {
                    msg.channel.send(emb('Nie znaleziono'));
                    return;
                }
                videos.forEach((vid, i) => {
                    embed.addField(`**Kanał: ${vid.author.name}**`, `**\`${i+1}.\` ${vid.name}**\nDługość: ${vid.duration}`);
                });
                msg.channel.send(embed).then(async nmsg => {
                    let imsg = await msg.channel.send(emb("Napisz numer utworu, który chcesz puścić, lub odpisz `stop` aby anulować wyszukanie"));
                    let eventL;
                    setTimeout(() => bot.removeListener("message", eventL), 120000);

                    bot.on("message", eventL = async rmsg => {
                        if(rmsg.author.id != msg.author.id || rmsg.channel.id != msg.channel.id) return;

                        if(videos[+rmsg.content - 1]) {
                            queue.addEntry(new MusicEntry({vid: videos[+rmsg.content - 1], member: msg.member, queue: queue, type: scRule ? "sc" : "yt"}), await msg.member.voice.channel.join(), args[0] == 'searchtop' || args[0] == 'searchsctop');
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
            } break;

            case 'skip': {
                if(queue.playing) {
                    msg.channel.send(emb('Skipped ⏩'));
                    queue._playNext();
                } else
                    msg.channel.send(emb('Nie ma czego skipować!'));
            } break;

            case 'pause': {
                if(queue.playing) {
                    queue.pause();
                    msg.channel.send(emb('Zapauzowano ⏸'));
                } else
                    msg.channel.send(emb('Nie ma czego pauzować!'));
            } break;

            case 'remove': {
                if(!args[1] || !queue.remove(args[1]))
                    msg.channel.send(emb('Podano błędną pozycję'));
            } break;

            case 'queue': {
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
            } break;

            case 'now': {
                if(queue.playing) {
                    let emb = queue._announce('nextSong', queue.playing, true).setAuthor('Teraz odtwarzane')
                    .spliceFields(-1, 0, [{name: 'Pozostało', value: queue.playing.timeLeft, inline: true},
                    {name: 'Stan', value: queue.playing.dispatcher.paused ? '⏸' : '▶️', inline: true}]);
                    msg.channel.send(emb);
                }
                else
                    msg.channel.send(emb('Nic nie jest odtwarzane'))
            } break;
        }
    }
}