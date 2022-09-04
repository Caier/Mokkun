import { VideoEntry } from "@caier/yts/lib/interfaces";
import { GuildMember } from "discord.js";

export interface IMusicHistory {
    type: 'yt'|'sc'
    videoInfo: VideoEntry
    addedBy: string
}