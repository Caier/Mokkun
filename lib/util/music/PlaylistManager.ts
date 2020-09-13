import { Collection } from "discord.js";
import { Playlist } from "./Playlist";

export class PlaylistManager {
    playlists: Collection<string, Playlist>;
    current: Playlist;
    
    static fromJSON(data: string | any) {

    }

    toJSON() {
        
    }
}