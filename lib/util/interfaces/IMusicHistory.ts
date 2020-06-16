import { TrackEntry } from "@caier/sc/lib/interfaces";
import { VideoEntry } from "@caier/yts/lib/interfaces";
import { GuildMember } from "discord.js";

export interface IMusicHistory {
    type: 'yt'|'sc'
    videoInfo: TrackEntry | VideoEntry
    addedBy: string
}