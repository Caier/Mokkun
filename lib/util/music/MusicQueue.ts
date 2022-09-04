// import { MusicEntry } from "./MusicEntry.js";
// import { TextChannel, BaseClient, Guild, VoiceChannel } from "discord.js";
// import { AudioPlayerStatus, createAudioPlayer, createAudioResource, StreamType, VoiceConnection, VoiceConnectionReadyState, VoiceConnectionStatus } from "@discordjs/voice";
// import { MokkunMusic } from "./MokkunMusic.js";
// import { Readable } from "stream";
// import { LoggedError } from "../errors/errors.js";
// import SafeEmbed from "../embed/SafeEmbed.js";
// import { IMusicHistory } from "../interfaces/IMusicHistory.js";
// import { getOpusStream } from "./OpusStreamFinder.js";
// import PlayspaceManager from "./PlayspaceManager.js";
// import Playspace from "./Playspace.js";
// import Utils from "../utils.js";

// export class MusicQueue extends BaseClient {
//     private idleTime = 0;
//     private tryingToPlay = false;
//     private readonly watchInterval = 1000;
//     private timer: NodeJS.Timer;
//     private readonly maxIdle = 600000;
//     private readonly master: MokkunMusic;
//     private toFinish = false;   //should the queue be stopped after current song ends
//     audioPlayer = createAudioPlayer();
//     playspaceManager: PlayspaceManager;
//     queue: MusicEntry[] = [];
//     history: IMusicHistory[];
//     VoiceCon: VoiceConnection;
//     VoiceChan: VoiceChannel;
//     playing: MusicEntry | null = null;
//     outChannel?: TextChannel;
//     autoplay = false;
//     loop = 0; //how many times should the current song be looped

//     constructor(master: MokkunMusic, guildId: string) { 
//         super();
//         this.master = master;
//         this.playspaceManager = master.bot.db.Data[guildId]?.music?.playspaces ? PlayspaceManager.fromJSON(master.bot.db.Data[guildId].music.playspaces) : new PlayspaceManager();
//         this.history = this.playspaceManager.current.history;
//         this.queue = this.playspaceManager.current.queue;
//         this.autoplay = master.bot.db.Data[guildId]?.music?.autoplay || false;
//         this.watch();
//     }

//     private nonBotListeners = () => [...this.VoiceChan.members.values()].filter(v => !v.user.bot).length;

//     private watch() {
//         this.timer = setInterval(() => {
//             if(this.idleTime >= this.maxIdle)
//                 this.stop();
//             else if(this.status == 'idle' && (this.queue.length > 0 || this.toFinish))
//                 this.playNext();
//             else if(['idle', 'disconnected'].includes(this.status) || this.nonBotListeners() == 0)
//                 this.idleTime += this.watchInterval;
//             else
//                 this.idleTime = 0;
//         }, this.watchInterval);
//     }

//     setVC(VoiceC: VoiceConnection, VoiceChan: VoiceChannel) {
//         this.VoiceCon = VoiceC;
//         this.VoiceChan = VoiceChan;
//         this.VoiceCon.subscribe(this.audioPlayer);
//         this.VoiceCon?.on(VoiceConnectionStatus.Disconnected, () => this.finish());
//     }

//     addEntry(entry: MusicEntry | MusicEntry[], top: boolean) {
//         if(!Array.isArray(entry))
//             entry = [entry];
//         if(top)
//             this.queue.unshift(...entry);
//         else
//             this.queue.push(...entry);
//         if(!this.playing)
//             this.playNext();
//         else if(entry.length == 1)
//             this.announce('addedToQueue', entry[0]);
//         if(entry.length > 1)
//             this.announce('addedMultiple', entry as any);
//         this.savePlayspaces();
//     }

//     async playNext() {
//         if(this.toFinish)
//             this.stop();
//         else if(this.loop > 0) {
//             await this.play(this.playing);
//             this.loop--;
//         }
//         else if(this.queue.length > 0) {
//             this.shiftToHistory();
//             this.playing = this.queue.shift() as MusicEntry;
//             this.savePlayspaces();
//             this.announce('nextSong');
//             await this.play(this.playing);
//         }
//         else
//             this.finish();
//     }

//     private shiftToHistory() {
//         if(!this.playing) return;
//         this.history.push(this.playing.toJSON());
//         this.savePlayspaces();
//         this.playspaceManager.current.playing = null;
//         this.playing = null;
//     }

//     private async play(entry: MusicEntry, retries = 0) {
//         try {
//             if(this.VoiceCon?.state.status != VoiceConnectionStatus.Ready) 
//                 throw Error('VoiceConnection is not ready');
//             this.tryingToPlay = true;
//             let str;
//             if(entry.type == 'yt')
//                 str = await getOpusStream(entry.videoInfo.url, {quality: 'highestaudio', highWaterMark: 1<<25});
//             else throw Error();
//             this.playing.audioRes = createAudioResource(str as Readable, {inputType: StreamType.Opus});
//             this.audioPlayer.play(this.playing.audioRes);
//             this.playing?.audioRes?.encoder?.setFEC(true);
//             if(!this.playing?.audioRes) {
//                 (<Readable> str)?.destroy();
//                 if(retries > 2) {
//                     this.tryingToPlay = false;
//                     throw new LoggedError(this.outChannel, "Cannot attach StreamDispatcher");
//                 }
//                 await new Promise(r => setTimeout(() => this.play(entry, retries + 1) && r(null), 1000));
//             } else this.tryingToPlay = false;
//         }
//         catch(e) {
//             this.tryingToPlay = false;
//             throw new LoggedError(this.outChannel, (e as Error).message);
//         }
//     }

//     private finish() {
//         this.audioPlayer.stop();
//         this.shiftToHistory();
//     }

//     savePlayspaces() {
//         this.master.bot.db.save(`Data.${this.outChannel.guild.id}.music.playspaces`, this.playspaceManager.toJSON());
//     }

//     announce(what: 'nextSong'|'addedToQueue'|'removed'|'addedMultiple', entry?: MusicEntry, ret?: boolean) : void | SafeEmbed {
//         if(!this.outChannel)
//             throw Error('Announement channel is not specified');
//         let embed = new SafeEmbed().setColor(entry?.type == 'sc' ? '#ff8800' : [112, 0, 55]);
//         if(what == 'nextSong') {
//             let pl = this.playing as MusicEntry;
//             embed.setAuthor('Następny utwór 🎵')
//             .setColor(pl?.type == 'sc' ? '#ff8800' : [112, 0, 55])
//             .setDescription(`**[${pl.videoInfo.name}](${pl.videoInfo.url})**`)
//             .setThumbnail(pl.videoInfo.thumbnail)
//             .addField("Kanał", pl.videoInfo.author.name, true)
//             .addField("Długość", pl.videoInfo.duration, true)
//             .addField("Dodano przez", pl.addedBy, true)
//             .addField("Następnie", this.queue[0]?.videoInfo.name ?? 'brak');
//         } 
//         else if(what == 'addedToQueue') {
//             let entry : MusicEntry = arguments[1];
//             let pos = this.queue.findIndex(v => v.id == entry.id) + 1;
//             let za: string | number;
//             if(pos == 1) {
//                 let milis = this.playing?.milisLeft + this.playing.videoInfo.milis * this.loop;
//                 za = milis == Infinity ? 'Nigdy' : Utils.milisToReadableTime(milis);
//             }
//             embed.setAuthor('Dodano do kolejki')
//             .setDescription(`**[${entry.videoInfo.name}](${entry.videoInfo.url})**`)
//             .setThumbnail(entry.videoInfo.thumbnail)
//             .addField("Kanał", entry.videoInfo.author.name, true)
//             .addField("Długość", entry.videoInfo.duration, true)
//             .addField("Za", ''+ za || this.timeLeft, true)
//             .addField("Pozycja", ''+pos);
//         }
//         else if(what == 'removed') {
//             let entry : MusicEntry = arguments[1];
//             embed.setAuthor('Usunięto z kolejki')
//             .setDescription(`**[${entry.videoInfo.name}](${entry.videoInfo.url})**`)
//             .setThumbnail(entry.videoInfo.thumbnail)
//             .addField("Następnie", this.queue[0]?.videoInfo.name ?? 'brak');
//         }
//         else if(what == 'addedMultiple')
//             embed.setAuthor(`Dodano ${(entry as any).length} utworów do kolejki`);
//         if(ret)
//             return embed;
//         this.outChannel.send({embeds: [embed]});
//     }
    
//     get milisLeft() {
//         let len = (this.playing?.videoInfo.milis || 0) - (this.playing?.strTime || 0) + this.playing.videoInfo.milis * this.loop;
//         for(let ent of this.queue.slice(0, -1))
//             len += ent.videoInfo.milis;
//         return len;
//     }

//     get timeLeft() {
//         return this.milisLeft == Infinity ? 'Nigdy' : new Date(this.milisLeft).toISOString().slice(11, -5).replace(/^0+:?0?/g, '');
//     }

//     pause() {
//         this.audioPlayer.pause();
//     }

//     resume() {
//         this.audioPlayer.unpause();
//     }

//     remove(posArr: string[]) {
//         let toRemove: MusicEntry[] = [];
//         let removed: MusicEntry[] = [];
//         let wrong: string[] = [];
//         for(let pos of posArr) {
//             if(pos == 'all') {
//                 toRemove.push(...this.queue);
//                 break;
//             }
//             if(!(/^[1-9]\d*$/).test(pos) || !this.queue[+pos-1]) {
//                 wrong.push(pos);
//                 continue;
//             }
//             toRemove.push(this.queue[+pos-1]);
//         }
//         for(let entry of toRemove)
//             removed.push(this.queue.splice(this.queue.findIndex(v => v.id == entry.id), 1)[0]);
//         if(this.queue.length == 0 && removed.length > 0)
//             this.outChannel?.send({embeds: [new SafeEmbed().setColor([112, 0, 55]).setAuthor('Wyczyszczono kolejkę')]});
//         else if(removed.length > 1)
//             this.outChannel?.send({embeds: [new SafeEmbed().setColor([112, 0, 55]).setAuthor(`Usunięto ${removed.length} utworów`).addField('Następnie', this.queue[0].videoInfo.name)]});
//         else
//             this.announce('removed', removed[0]);
//         this.playspaceManager.current.queue = this.queue;
        
//         return wrong;
//     }

//     disconnect() {
//         this.VoiceCon?.disconnect();
//         this.finish();
//     }

//     setOutChan(chan: TextChannel) {
//         this.outChannel = chan;
//         return this;
//     }

//     get status() {
//         return this.audioPlayer.state.status == AudioPlayerStatus.Paused ? 'paused' 
//         : this.audioPlayer.state.status == AudioPlayerStatus.Playing ? 'playing' 
//         : this.VoiceCon?.state.status != VoiceConnectionStatus.Ready ? 'disconnected' 
//         : this.tryingToPlay ? 'busy' 
//         : 'idle';
//     }

//     toggleAutoplay() {
//         this.autoplay = !this.autoplay;
//         this.master.bot.db.save(`Data.${this.outChannel.guild.id}.music.autoplay`, this.autoplay);
//         return this.autoplay;
//     }

//     switchPlayspace(ps: string | Playspace) {
//         if(typeof ps == 'string') {
//             if(ps.toLowerCase() == 'default')
//                 ps = this.playspaceManager.spaces.find(s => s.isDefault);
//             else
//                 ps = this.playspaceManager.spaces.find(s => s.name == ps);
//             if(!ps)
//                 throw Error('This Playspace does not exist');
//         }

//         this.finish();
//         this.playspaceManager.current = ps;
//         this.history = this.playspaceManager.current.history;
//         this.queue = this.playspaceManager.current.queue;
//         this.savePlayspaces();
//     }

//     softStop() {
//         let w = Boolean(this.playing);
//         if(!w)
//             this.stop();
//         else
//             this.toFinish = true;
//         return w;
//     }

//     stop() {
//         clearInterval(this.timer);
//         this.audioPlayer.stop();
//         this.disconnect();
//         this.savePlayspaces();
//         super.destroy();
//         this.master.deleteQueue(this.outChannel.guild.id);
//         for(let prop in this)
//             delete this[prop];
//     }

//     destroy() {
//         let db = this.master.bot.db, id = this.outChannel.guild.id;
//         this.stop();
//         db.save(`Data.${id}.music`, undefined);
//     }
// }