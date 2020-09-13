import { MusicEntry } from "./MusicEntry";
import ytfps from 'ytfps';
import { VideoEntry } from "@caier/yts/lib/interfaces";
import { IMusicHistory } from "../interfaces/IMusicHistory";

export class Playlist {
    private entries: MusicEntry[] = [];
    name: string;
    thumbnail?: string;
    author: string;

    constructor(opts: {name: string, thumbnail?: string, author: string}) {
        Object.assign(this, opts);
    }

    static async fromYTlist(url: string, by: string) {
        let pl = await ytfps(url);
        let list = new Playlist({name: pl.title, thumbnail: pl.thumbnail_url, author: by});
        list.addEntry(pl.videos.map(v => new MusicEntry({
            vid: <VideoEntry> {
                name: v.title,
                url: v.url,
                description: '',
                thumbnail: v.thumbnail_url,
                duration: v.length,
                milis: v.milis_length,
                views: 0,
                author: {
                    name: v.author.name,
                    url: v.author.url
                }
            }, type: 'yt', by: by
        })));

        return list;
    }

    static fromJSON(playlistData: string | any) {
        if(typeof playlistData == 'string')
            playlistData = JSON.parse(playlistData);

        let p = new Playlist({...playlistData});
        p.addEntry(playlistData.entries.map((e: IMusicHistory) => MusicEntry.fromJSON(e)));
        return p;
    }

    addEntry(entry: MusicEntry | MusicEntry[], top = false) {
        if(!Array.isArray(entry))
            entry = [entry];
        if(top)
            this.entries.unshift(...entry);
        else
            this.entries.push(...entry);
    }

    removeEntry(arg: number | ((arg0: MusicEntry) => boolean)): boolean {
        if(typeof arg == 'number')
            return (this.entries.splice(arg, 1)) ? true : false;
        else if(typeof arg == 'function')
            return (this.entries.splice(this.entries.findIndex(arg), 1)) ? true : false;
        else
            return false;
    }

    showEntries() {
        return [...this.entries];
    }

    get millisLength() {
        let len = 0;
        for(let ent of this.entries)
            len += ent.videoInfo.milis;
        return len;
    }

    get timeLength() {
        return new Date(this.millisLength).toISOString().slice(11, -5).replace(/^0+:?0?/g, '');
    }

    toJSON() {
        let obj: any = Object.assign({}, this);
        obj.entries = this.entries.map(e => e.toJSON());
        return obj;
    }
}