/// <reference types="node" />
import { TextChannel, MessageEmbed, Guild, GuildMember, StreamDispatcher } from 'discord.js';
import VoiceConnection from 'discord.js/src/client/voice/VoiceConnection';
import { VideoEntry } from '@caier/yts/lib/interfaces';
export declare class MusicEntry {
    id: string;
    addedOn: number;
    addedBy: GuildMember;
    queue: MusicQueue;
    type: "yt" | "sc";
    videoInfo: VideoEntry;
    dispatcher?: StreamDispatcher;
    constructor(opts: {
        vid: VideoEntry;
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
    addEntry(entry: MusicEntry, VoiceC: VoiceConnection): void;
    _playNext(): void;
    play(entry: MusicEntry): Promise<void>;
    _finish(): void;
    set destTimer(timer: NodeJS.Timeout);
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
    static getYTStream(url: string): Promise<import("stream").Readable>;
    destroyQueue(guildid: string): void;
}
//# sourceMappingURL=MokkunMusic.d.ts.map