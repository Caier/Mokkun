import { TrackEntry } from "@caier/sc/lib/interfaces";
import { VideoEntry } from "@caier/yts/lib/interfaces";

export interface IMusicHistory {
    type: 'yt'|'sc',
    videoInfo: TrackEntry | VideoEntry
}