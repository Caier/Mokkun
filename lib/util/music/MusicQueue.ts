import { MusicEntry } from "./MusicEntry";
import { VoiceConnection, TextChannel, BaseClient, Guild } from "discord.js";
import { MokkunMusic } from "./MokkunMusic";
import { TrackEntry } from "@caier/sc/out/interfaces";
import { Readable } from "stream";
import { LoggedError } from "../errors/errors";
import sc from '@caier/sc';
import ytdl from 'ytdl-core-discord';
import yts from '@caier/yts';
import { SafeEmbed } from "../embed/SafeEmbed";
import { IMusicHistory } from "../interfaces/IMusicHistory";
import { isArray } from "util";
import ax from 'axios';
import $ from 'cheerio';

export class MusicQueue extends BaseClient {
    private idleTime = 0;
    private tryingToPlay = false;
    private readonly watchInterval = 1000;
    private readonly maxIdle = 600000;
    private readonly master: MokkunMusic;
    private readonly maxHistory = 200;
    queue: MusicEntry[] = [];
    history: IMusicHistory[];
    VoiceCon: VoiceConnection;
    playing: MusicEntry | null = null;
    outChannel?: TextChannel;
    autoplay = false;

    constructor(master: MokkunMusic, guild: Guild) { 
        super();
        this.master = master;
        this.history = (this.master.bot.db.Data?.[guild.id]?.musicHistory || []) as IMusicHistory[];
        this.watch();
    }

    private watch() {
        this.setInterval(() => {
            if(this.idleTime >= this.maxIdle)
                this.master.destroyQueue(this.outChannel.guild);
            else if(this.status == 'idle' && this.queue.length > 0)
                this.playNext();
            else if(['idle', 'paused', 'disconnected'].includes(this.status) || this.VoiceCon?.channel.members.array().filter(v => !v.user.bot).length == 0)
                this.idleTime += this.watchInterval;
            else
                this.idleTime = 0;
        }, this.watchInterval);
    }

    setVC(VoiceC: VoiceConnection) {
        this.VoiceCon = VoiceC;
        this.VoiceCon?.on('disconnect', () => this.finish());
    }

    addEntry(entry: MusicEntry | MusicEntry[], top: boolean) {
        if(!isArray(entry))
            entry = [entry];
        if(top)
            this.queue.unshift(...entry);
        else
            this.queue.push(...entry);
        if(!this.playing)
            this.playNext();
        else if(entry.length == 1)
            this.announce('addedToQueue', entry[0]);
        if(entry.length > 1)
            this.announce('addedMultiple', entry as any);
    }

    async playNext() {
        if(this.queue.length > 0) {
            this.shiftToHistory();
            this.playing = this.queue.shift() as MusicEntry;
            this.announce('nextSong');
            await this.play(this.playing);
        }
        else if(this.autoplay && this.playing?.type == 'yt') {
            this.playing.dispatcher?.destroy();
            this.addAutoNext();
            this.shiftToHistory();
        }
        else
            this.finish();
    }

    private addAutoNext() {
        ax.get(this.playing.videoInfo.url + '&disable_polymer=1').then(async resp => {
            this.addEntry(new MusicEntry({vid: (await yts('https://www.youtube.com' + $('.autoplay-bar .content-link', resp.data).attr('href'))).videos[0],
                                          member: {user: {username: 'Autoodtwarzanie'}} as any, queue: this, type: 'yt'}), false);
        }).catch(err => {
            throw new LoggedError(this.outChannel, err.message);
        });
    }

    private shiftToHistory() {
        if(!this.playing) return;
        this.history.push(this.playing.toJSON());
        this.master.bot.db.save(`Data.${this.outChannel.guild.id}.musicHistory`, this.history.slice(-this.maxHistory));
        this.playing = null;
    }

    private async play(entry: MusicEntry, retries = 0) {
        try {
            if(this.VoiceCon?.status != 0) 
                throw Error('VoiceConnection is not ready');
            this.tryingToPlay = true;
            let str;
            if(entry.type == 'yt')
                str = await ytdl(entry.videoInfo.url, {quality: 'highestaudio', highWaterMark: 1<<25});
            else if(entry.type == 'sc')
                str = await sc.download((entry.videoInfo as TrackEntry).id, true);
            (<Readable> str).on('end', () => setTimeout(() => this.playNext(), 2000));
            (<MusicEntry> this.playing).dispatcher = this.VoiceCon.play(str as Readable, {type: 'opus', highWaterMark: 12});
            this.playing?.dispatcher?.setFEC(true);
            if(!this.playing?.dispatcher) {
                (<Readable> str)?.destroy();
                if(retries > 2) {
                    this.tryingToPlay = false;
                    throw new LoggedError(this.outChannel, "Cannot attach StreamDispatcher");
                }
                await new Promise(r => setTimeout(() => this.play(entry, retries + 1) && r(), 1000));
            } else this.tryingToPlay = false;
        }
        catch(e) {
            this.tryingToPlay = false;
            throw new LoggedError(this.outChannel, e.message);
        }
    }

    private finish() {
        this.playing?.dispatcher?.destroy();
        this.shiftToHistory();
    }

    announce(what: 'nextSong'|'addedToQueue'|'removed'|'addedMultiple', entry?: MusicEntry, ret?: boolean) : void | SafeEmbed {
        if(!this.outChannel)
            throw Error('Announement channel is not specified');
        let embed = new SafeEmbed().setColor(entry?.type == 'sc' ? '#ff8800' : [112, 0, 55]);
        if(what == 'nextSong') {
            let pl = this.playing as MusicEntry;
            embed.setAuthor('Następny utwór 🎵')
            .setColor(pl?.type == 'sc' ? '#ff8800' : [112, 0, 55])
            .setDescription(`**[${pl.videoInfo.name}](${pl.videoInfo.url})**`)
            .setThumbnail(pl.videoInfo.thumbnail)
            .addField("Kanał", pl.videoInfo.author.name, true)
            .addField("Długość", pl.videoInfo.duration, true)
            .addField("Dodano przez", pl.addedBy.user.username, true)
            .addField("Następnie", this.queue[0]?.videoInfo.name ?? 'brak');
        } 
        else if(what == 'addedToQueue') {
            let entry : MusicEntry = arguments[1];
            let pos = this.queue.findIndex(v => v.id == entry.id) + 1;
            embed.setAuthor('Dodano do kolejki')
            .setDescription(`**[${entry.videoInfo.name}](${entry.videoInfo.url})**`)
            .setThumbnail(entry.videoInfo.thumbnail)
            .addField("Kanał", entry.videoInfo.author.name, true)
            .addField("Długość", entry.videoInfo.duration, true)
            .addField("Za", pos == 1 ? this.playing?.timeLeft : this.timeLeft, true)
            .addField("Pozycja", pos);
        }
        else if(what == 'removed') {
            let entry : MusicEntry = arguments[1];
            embed.setAuthor('Usunięto z kolejki')
            .setDescription(`**[${entry.videoInfo.name}](${entry.videoInfo.url})**`)
            .setThumbnail(entry.videoInfo.thumbnail)
        }
        else if(what == 'addedMultiple')
            embed.setAuthor(`Dodano ${(entry as any).length} utworów do kolejki`);
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

    remove(posArr: string[]) {
        let toRemove: MusicEntry[] = [];
        let removed: MusicEntry[] = [];
        let wrong: string[] = [];
        for(let pos of posArr) {
            if(pos == 'all') {
                toRemove.push(...this.queue);
                break;
            }
            if(!(/^[1-9]\d*$/).test(pos) || !this.queue[+pos-1]) {
                wrong.push(pos);
                continue;
            }
            toRemove.push(this.queue[+pos-1]);
        }
        for(let entry of toRemove)
            removed.push(this.queue.splice(this.queue.findIndex(v => v.id == entry.id), 1)[0]);
        if(this.queue.length == 0 && removed.length > 0)
            this.outChannel?.send(new SafeEmbed().setColor([112, 0, 55]).setAuthor('Wyczyszczono kolejkę'));
        else
            removed.forEach(v => this.announce('removed', v));
        
        return wrong;
    }

    disconnect() {
        this.VoiceCon?.disconnect();
        this.finish();
    }

    setOutChan(chan: TextChannel) {
        this.outChannel = chan;
        return this;
    }

    get status() {
        return this.playing?.dispatcher?.paused ? 'paused' 
        : this.playing?.dispatcher ? 'playing' 
        : this.VoiceCon?.status != 0 ? 'disconnected' 
        : this.tryingToPlay ? 'busy' 
        : 'idle';
    }

    toggleAutoplay() {
        this.autoplay = !this.autoplay;
        return this.autoplay;
    }

    destroy() {
        this.playing?.dispatcher?.destroy();
        this.disconnect();
        this.master.bot.db.save(`Data.${this.outChannel.guild.id}.musicHistory`, this.history.slice(-this.maxHistory));
        super.destroy();
        for(let prop in this)
            delete this[prop];
    }
}