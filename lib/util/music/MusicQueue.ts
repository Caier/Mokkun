import { MusicEntry } from "./MusicEntry";
import { VoiceConnection, TextChannel } from "discord.js";
import { MokkunMusic } from "./MokkunMusic";
import { TrackEntry } from "@caier/sc/out/interfaces";
import { Readable } from "stream";
import { LoggedError } from "../errors/errors";
import sc from '@caier/sc';
import { SafeEmbed } from "../embed/SafeEmbed";

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
            this.playNext();
        else
            this.announce('addedToQueue', entry);
    }

    playNext() {
        if(this.queue.length > 0) {
            if(this.playing)
                this.history.push(this.playing);
            this.playing = this.queue.shift() as MusicEntry;
            this.play(this.playing);
            this.announce('nextSong');
        }
        else
            this.finish();
    }

    private async play(entry: MusicEntry, retries = 0) {
        if(this.VoiceCon.status != 0) 
            throw Error('VoiceConnection is not ready');
        let str;
        if(entry.type == 'yt')
            str = await MokkunMusic.getYTStream(entry.videoInfo.url);
        else if(entry.type == 'sc')
            str = await sc.download((entry.videoInfo as TrackEntry).id, true);
        (<Readable> str).on('end', () => setTimeout(() => this.playNext(), 2000));
        (<MusicEntry> this.playing).dispatcher = this.VoiceCon.play(str as Readable, {type: 'opus', highWaterMark: 1});
        this.playing?.dispatcher?.setFEC(true);
        if(!this.playing?.dispatcher) {
            (<Readable> str)?.destroy();
            if(retries > 2) {
                this.playNext();
                throw new LoggedError(this.outChannel, "Cannot attach StreamDispatcher");
            }
            await new Promise(r => setTimeout(() => this.play(entry, retries + 1) && r(), 1000));
        }
    }

    private finish() {
        this.playing?.dispatcher?.pause?.();
        if(this.playing)
            this.history.push(this.playing);
        this.playing = null;
        this.destTimer = setTimeout(() => {
            if(!this.playing)
                this.VoiceCon.disconnect(); 
        }, 600000);
    }

    private set destTimer(timer: NodeJS.Timeout) {
        this.timer && clearTimeout(this.timer);
        this.timer = timer;
    }

    announce(what: 'nextSong'|'addedToQueue'|'removed', entry?: MusicEntry, ret?: boolean) : void | SafeEmbed {
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
        if(this.queue.length == 0)
            this.outChannel?.send(new SafeEmbed().setColor([112, 0, 55]).setAuthor('Wyczyszczono kolejkę'));
        else
            removed.forEach(v => this.announce('removed', v));
        
        return wrong;
    }

    setOutChan(chan: TextChannel) : MusicQueue {
        this.outChannel = chan;
        return this;
    }

    get status() {
        return this.playing?.dispatcher?.paused ? 'paused' : this.playing?.dispatcher ? 'playing' : 'idle';
    }

    destroy() {
        this.playing?.dispatcher?.destroy();
        for(let prop in this)
            this[prop] = undefined;
    }
}