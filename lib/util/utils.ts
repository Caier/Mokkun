import Discord from 'discord.js';
import fs from 'fs-extra';
import path from 'path';

namespace Utils {
    /**
     * A function that converts a human timestamp to epoch
     * @param timeStr The time string in the `*M*d*h*m*s` format (order is not inportant)
     * @returns Microsecond timestamp in epoch
     */
    export function parseTimeStrToMilis(timeStr: string) {
        if(!/([0-9]+[Mdhms]+)+/.test(timeStr)) 
            throw RangeError('Given string is not in the human timestamp format');
        let timeInc = {"M": 0, "d": 0, "h": 0, "m": 0, "s": 0};
        for(let x of Object.keys(timeInc)) {
            if(timeStr.includes(x)) {
                let temp = timeStr.slice(0, timeStr.indexOf(x)).split("").reverse().join("").trim();
                if(/[A-z]/.test(temp))
                    temp = temp.slice(0, temp.search(/[A-z]/g)).split("").reverse().join("");
                else
                    temp = temp.split("").reverse().join("");
                (timeInc as any)[x] += +temp;
            }
        }
        return (timeInc["M"] * 2629743 + timeInc["d"] * 86400 + timeInc["h"] * 3600 + timeInc["m"] * 60 + timeInc["s"]) * 1000;
    }

    /**
     * Fetches messages from a Discord TextChannel
     * @param msg A message object
     * @param much How many messages should be fetched
     * @param user Whose messages should be fetched
     * @param before Which message should be the starting point for fetching
     * @returns A collection of messages keyed by their ids
     */
    export async function fetchMsgs(msg: Discord.Message, much: number, user: string, before: string) {
        let msgs = await msg.channel.messages.fetch((before) ? {limit: 100, before: before} : {limit: 100});
        if(msgs.size == 0) return msgs;
        let fmsg = msgs?.last()?.id;
        if(user) msgs = msgs.filter(e => e.author.id == user);
        if(msgs.size != 0) fmsg = msgs?.last()?.id;
        while(msgs.size < much)
        {
            let temp = await msg.channel.messages.fetch({limit: 100, before: fmsg});
            if(temp.size != 0) fmsg = temp?.last()?.id;
            else break;
            if(user) temp = temp.filter(e => e.author.id == user);
            msgs = msgs.concat(temp);
            if(temp.size != 0) fmsg = temp?.last()?.id;
        }
        let cnt = 0;
        msgs = msgs.filter(() => {cnt++; return cnt <= much})
        return msgs;
    }

    /**
     * Scans a directory recursively
     * @param dir Path to the directory
     * @returns Array of exploded directory entries
     */
    export function dirWalk(dir: string) {
        if(!fs.existsSync(dir))
            throw Error("Directory does not exist");
        if(!fs.statSync(dir).isDirectory())
            throw Error("Specified path is not a directory");
        
        let content = fs.readdirSync(dir);
        content.forEach((v, i, a) => {
            if(fs.statSync(path.join(dir, v)).isDirectory()) {
                delete a[i];
                a.push(...dirWalk(path.join(dir, v)).map(nv => path.normalize(`${v}/${nv}`)));
            }
        });

        return content.filter(Boolean);
    }

    /**
     * A function that returns a random integer between min & max (both included in the roll)
     * @param min The minumum number
     * @param max  The maximum number
     * @returns Random integer
     */
    export function rand(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
}

export default Utils;