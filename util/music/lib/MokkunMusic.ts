import { Collection, TextChannel, MessageEmbed, Guild, GuildMember, StreamDispatcher } from 'discord.js';
// @ts-ignore
import VoiceConnection from 'discord.js/src/client/voice/VoiceConnection';
import ytdl from 'ytdl-core-discord';
import yts from '@caier/yts';
import { VideoEntry } from '@caier/yts/lib/interfaces';
import uuid from 'uuid/v4';
import sc from '@caier/sc';
import { SongEntry } from '@caier/sc/out/interfaces';

export class MusicEntry {
    id: string = uuid();
    addedOn: number = Date.now();
    addedBy: GuildMember;
    queue: MusicQueue;
    type: "yt"|"sc";
    videoInfo: VideoEntry | SongEntry;
    dispatcher?: StreamDispatcher;

    constructor(opts: {vid: VideoEntry | SongEntry, member: GuildMember, queue: MusicQueue, type: "yt"|"sc"}) {
        this.addedBy = opts.member;
        this.queue = opts.queue;
        this.type = opts.type;
        this.videoInfo = opts.vid;
    }
    
    get strTime() {
        return this.dispatcher?.streamTime ?? 0;
    }

    get milisLeft() {
        return this.videoInfo.milis - this.strTime;
    }

    get timeLeft() {
        return new Date(this.milisLeft).toISOString().slice(11, -5).replace(/^0+:?0?/g, '');
    }
}

export class MusicQueue {
    private timer?: NodeJS.Timeout;
    queue: MusicEntry[] = [];
    history: MusicEntry[] = [];
    VoiceCon: VoiceConnection;
    playing: MusicEntry | null = null;
    outChannel?: TextChannel;

    addEntry(entry: MusicEntry, VoiceC: VoiceConnection, top: boolean) {
        this.VoiceCon = VoiceC;
        if(top)
            this.queue.unshift(entry);
        else
            this.queue.push(entry);
        if(!this.playing)
            this._playNext();
        else
            this._announce('addedToQueue', entry);
    }

    _playNext() {
        if(this.queue.length > 0) {
            if(this.playing)
                this.history.push(this.playing);
            this.playing = this.queue.shift() as MusicEntry;
            this.play(this.playing);
            this._announce('nextSong');
        }
        else
            this._finish();
    }

    async play(entry: MusicEntry) {
        if(this.VoiceCon.status != '0') 
            throw Error('VoiceConnection is not ready');
        let str;
        if(entry.type == 'yt')
            str = await MokkunMusic.getYTStream(entry.videoInfo.url);
        else if(entry.type == 'sc')
            str = await sc.download((entry.videoInfo as SongEntry).id);
        (<NodeJS.ReadableStream> str).on('end', () => setTimeout(() => this._playNext(), 2000));
        (<MusicEntry> this.playing).dispatcher = this.VoiceCon.play(str, {type: 'opus', highWaterMark: 1});
        this.playing?.dispatcher?.setFEC(true);
    }

    _finish() {
        this.playing?.dispatcher?.pause?.();
        if(this.playing)
            this.history.push(this.playing);
        this.playing = null;
        this.destTimer = setTimeout(() => {
            if(!this.playing)
                this.VoiceCon.disconnect(); 
        }, 600000);
    }

    set destTimer(timer: NodeJS.Timeout) {
        this.timer && clearTimeout(this.timer);
        this.timer = timer;
    }

    _announce(what: 'nextSong'|'addedToQueue'|'removed', entry?: MusicEntry, ret?: boolean) : void | MessageEmbed {
        if(!this.outChannel)
            throw Error('Announement channel is not specified');
        let embed = new MessageEmbed().setColor([112, 0, 55]);
        if(what == 'nextSong') {
            let pl = this.playing as MusicEntry;
            embed.setAuthor('Następny utwór 🎵')
            .setDescription(`**[${pl.videoInfo.name}](${pl.videoInfo.url})**`)
            .setThumbnail(pl.videoInfo.thumbnail)
            .addField("Kanał", pl.videoInfo.author.name, true)
            .addField("Długość", pl.videoInfo.duration, true)
            .addField("Dodano przez", pl.addedBy.user.username, true)
            .addField("Następnie", this.queue[0]?.videoInfo.name ?? 'brak');
        } 
        else if(what == 'addedToQueue') {
            let entry : MusicEntry = arguments[1];
            embed.setAuthor('Dodano do kolejki')
            .setDescription(`**[${entry.videoInfo.name}](${entry.videoInfo.url})**`)
            .setThumbnail(entry.videoInfo.thumbnail)
            .addField("Kanał", entry.videoInfo.author.name, true)
            .addField("Długość", entry.videoInfo.duration, true)
            .addField("Za", this.timeLeft, true)
            .addField("Pozycja", this.queue.findIndex(v => v.id == entry.id) + 1);
        }
        else if(what == 'removed') {
            let entry : MusicEntry = arguments[1];
            embed.setAuthor('Usunięto z kolejki')
            .setDescription(`**[${entry.videoInfo.name}](${entry.videoInfo.url})**`)
            .setThumbnail(entry.videoInfo.thumbnail)
        }
        if(ret)
            return embed;
        this.outChannel.send(embed);
    }

    get milisLeft() {
        let len = (this.playing?.videoInfo.milis || 0) - (this.playing?.strTime || 0);
        for(let ent of this.queue.slice(0, -1))
            len += ent.videoInfo.milis;
        return len;
    }

    get timeLeft() {
        return new Date(this.milisLeft).toISOString().slice(11, -5).replace(/^0+:?0?/g, '');
    }

    pause() {
        this.playing?.dispatcher?.pause();
    }

    resume() {
        this.playing?.dispatcher?.resume();
    }

    remove(pos: string) : boolean {
        if(!(/^[1-9]\d*$/).test(pos) || !this.queue[+pos-1]) {
            return false;
        }
        this._announce('removed', this.queue.splice(+pos-1, 1)[0]);
        return true;
    }

    setOutChan(chan: TextChannel) : MusicQueue {
        this.outChannel = chan;
        return this;
    }

    get status() {
        return this.playing?.dispatcher?.paused ? 'paused' : this.playing?.dispatcher ? 'playing' : 'idle';
    }
}

export class MokkunMusic {
    private queues = new Collection<string, MusicQueue>();

    constructor() {
        sc.setClientId(process.env.SC_CLIENT_ID as string);
    }

    getQueue(guild: Guild) : MusicQueue {
        let q = this.queues.get(guild.id);
        if(!q) {
            q = new MusicQueue();
            this.queues.set(guild.id, q);
        }
        return q;
    }

    searchVideos(query: string) {
        return yts(query);
    }

    searchSC(query: string) {
        return sc.search(query);
    }

    static getYTStream(url: string) {
        return ytdl(url, {quality: 'highestaudio', highWaterMark: 1<<25});
    }

    destroyQueue(guildid: string) {
        this.queues.delete(guildid);
    } 
}