/// <reference types="node" />
import { TextChannel, MessageEmbed, Guild, GuildMember, StreamDispatcher } from 'discord.js';
import VoiceConnection from 'discord.js/src/client/voice/VoiceConnection';
import { VideoEntry } from '@caier/yts/lib/interfaces';
import { TrackEntry } from '@caier/sc/out/interfaces';
import { Readable } from 'stream';
export declare class MusicEntry {
    id: string;
    addedOn: number;
    addedBy: GuildMember;
    queue: MusicQueue;
    type: "yt" | "sc";
    videoInfo: VideoEntry | TrackEntry;
    dispatcher?: StreamDispatcher;
    constructor(opts: {
        vid: VideoEntry | TrackEntry;
        member: GuildMember;
        queue: MusicQueue;
        type: "yt" | "sc";
    });
    get strTime(): number;
    get milisLeft(): number;
    get timeLeft(): string;
}
export declare class MusicQueue {
    private timer?;
    queue: MusicEntry[];
    history: MusicEntry[];
    VoiceCon: VoiceConnection;
    playing: MusicEntry | null;
    outChannel?: TextChannel;
    addEntry(entry: MusicEntry, VoiceC: VoiceConnection, top: boolean): void;
    _playNext(): void;
    private play;
    private _finish;
    private set destTimer(value);
    _announce(what: 'nextSong' | 'addedToQueue' | 'removed', entry?: MusicEntry, ret?: boolean): void | MessageEmbed;
    get milisLeft(): number;
    get timeLeft(): string;
    pause(): void;
    resume(): void;
    remove(pos: string): boolean;
    setOutChan(chan: TextChannel): MusicQueue;
    get status(): "idle" | "paused" | "playing";
}
export declare class MokkunMusic {
    private queues;
    getQueue(guild: Guild): MusicQueue;
    searchVideos(query: string): Promise<import("@caier/yts/out/interfaces").YTSResponse>;
    searchSC(query: string): Promise<import("@caier/sc/out/interfaces").SCResponse>;
    static getYTStream(url: string): Promise<Readable>;
    destroyQueue(guildid: string): void;
}
//# sourceMappingURL=MokkunMusic.d.ts.map