// This is directly based on [ytdl-core-discord](https://www.npmjs.com/package/ytdl-core-discord), of which slow development progress and updates I'm not happy.
// Because of that, I'm implementing its functionality directly into Mokkun, so I don't have to worry about late updates.

import ytdl, { downloadOptions, videoFormat } from 'ytdl-core';
import prism from 'prism-media';

function filter(format: videoFormat) {
    return format.codecs === 'opus' &&
        format.container === 'webm' &&
        format.audioSampleRate == '48000';
}

/**
 * Tries to find the highest bitrate audio-only format. Failing that, will use any available audio format.
 * @private
 * @param {Object[]} formats The formats to select from
 * @param {boolean} isLive Whether the content is live or not
 */
function nextBestFormat(formats: videoFormat[], isLive: boolean) {
    let filter = (format: videoFormat) => Boolean(format.audioBitrate);
    if (isLive) filter = format => !!format.audioBitrate && format.isHLS;
    formats = formats
        .filter(filter)
        .sort((a, b) => b.audioBitrate! - a.audioBitrate!);
    return formats.find(format => !format.bitrate) || formats[0];
}

export async function getOpusStream(url: string, options: downloadOptions = {}) {
    const info = await ytdl.getInfo(url);
    // Prefer opus
    const format = info.formats.find(filter);
    const canDemux = format && info.videoDetails.lengthSeconds != '0';
    if (canDemux) options = { ...options, filter };
    else if (+info.videoDetails.lengthSeconds != 0) options = { ...options, filter: 'audioonly' };
    if (canDemux) {
        const demuxer = new prism.opus.WebmDemuxer();
        return ytdl.downloadFromInfo(info, options).pipe(demuxer).on('end', () => demuxer.destroy());
    } else {
        const bestFormat = nextBestFormat(info.formats, info.player_response.videoDetails.isLiveContent);
        if (!bestFormat) throw new Error('No suitable format found');
        const transcoder = new prism.FFmpeg({
            args: [
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '5',
                '-i', bestFormat.url,
                '-analyzeduration', '0',
                '-loglevel', '0',
                '-f', 's16le',
                '-ar', '48000',
                '-ac', '2',
            ],
        });
        const opus = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });
        const stream = transcoder.pipe(opus);
        stream.on('close', () => {
            transcoder.destroy();
            opus.destroy();
        });
        return stream;
    }
}