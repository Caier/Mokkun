import Discord, { TextChannel, MessageReaction, User, CollectorOptions, MessageEmbed, DMChannel, ReactionCollector } from 'discord.js';
import fs from 'fs-extra';
import path from 'path';
import { SafeEmbed } from './embed/SafeEmbed';

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
     * Converts H:M:S time format to milis
     * @param timeStr H:M:S string
     * @param splitter if you want to use other splitter than ':'
     * @param secsInLast how many seconds is one unit of the rightmost number
     */
    export function HMStoMilis(timeStr: string, secsInLast = 1, splitter = ':') {
        let timeArr = timeStr.trim().split(splitter).reverse();
        let secs = 0;
        for(let i = 0, m = secsInLast; i < timeArr.length; i++, m *= 60)
            secs += +timeArr[i] * m;
        return secs * 1000;
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

    /**
     * Function used to create a multipage embed message from an array of MessageEmbeds
     * @param channel Channel to send the embed to
     * @param pages Array of MessageEmbeds
     * @param opts (optional) object with additional options
     * @param opts.triggers Who should trigger the collector (Array of UserIDs)
     * @param opts.emojis Which emojis to use as reactions (Default: ['⏪', '◀', '▶', '⏩'])
     * @param opts.collOpts Options of the reactionCollector
     * @returns Reaction collector
     */
    export async function createPageSelector(channel: TextChannel | DMChannel, pages: MessageEmbed[], opts?: {triggers?: string[], emojis?: string[], collOpts?: CollectorOptions}) {
        let emojis = opts?.emojis || ['⏪', '◀', '▶', '⏩', '❌'];
        let nmsg = await channel.send(pages[0]);
        let curPage = 0;
        for(let em of emojis.filter(Boolean))
            await nmsg.react(em);
        let coll = nmsg.createReactionCollector((react: MessageReaction, user: User) => !user.bot &&
            emojis.includes(react.emoji.name) && (!opts?.triggers || opts?.triggers.includes(user.id)), opts?.collOpts || {time: 120000});
        coll.on('collect', (react, user) => {
            if(channel instanceof TextChannel) react.users.remove(user.id);
            switch(react.emoji.name) {
                case emojis[0]: (curPage = 0) || nmsg.edit(pages[0]); break;
                case emojis[1]: curPage > 0 && nmsg.edit(pages[--curPage]); break;
                case emojis[2]: curPage < pages.length - 1 && nmsg.edit(pages[++curPage]); break;
                case emojis[3]: (curPage = pages.length - 1) && nmsg.edit(pages[pages.length - 1]); break;
                case emojis[4]: nmsg.delete({timeout: 150});
            }
        });
        return [coll, nmsg];
    }

    /**
     * Converts amount of time in miliseconds to a readable time string
     * @param milis The number of miliseconds
     */
    export function milisToReadableTime(milis: number) {
        return new Date(milis).toISOString().slice(11, -5).replace(/^0+:?0?/g, '');
    }

    /**
     * Shuffles a copy of provided array and returns it
     * @param array The array to shuffle
     * @returns The shuffled array
     */
    export function arrayShuffle<T>(array: T[]) {
        array = array.slice();
        for(let i = 0; i < array.length - 2; i++) {
            let j = rand(i, array.length - 1);
            let temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }
    
    /**
     * Creates a Yes/No confirmation box
     * @param channel Channel in which the confirmation box should be sent
     * @param question The content of the confirmation box
     * @param who The user who needs to respond
     * @param color Color of the embed
     * @param emojis Emojis which are going to be used as reactions
     * @returns `true` if user answered yes, `false` if user answered no
     */
    export function confirmBox(channel: TextChannel | DMChannel, question: string, who: User, color = '#bc0000', emojis = ['✅', '❌']) : Promise<boolean> {
        return new Promise(async res => {
            let c = false;
            let msg = await channel.send(new SafeEmbed({author: {name: 'Uwaga!'}, description: question, color: color, footer: {text: 'Zdecyduj, używając poniższych reakcji'}}));
            for(let e of emojis)
                await msg.react(e);
            let coll = msg.createReactionCollector((react: MessageReaction, user: User) => !user.bot && user.id == who.id && emojis.includes(react.emoji.name), {time: 120000});
            coll.on('collect', react => {
                c = true;
                res(react.emoji.name == emojis[0]);
                coll.stop();
            });
            coll.on('end', () => {
                msg.delete({timeout: 150});
                if(!c) {
                    channel.send(new SafeEmbed({color: color, author: {name: "Użytkownik nie wybrał żadnej z opcji."}}));
                    res(false);
                }
            });
        });
    }

    /**
     * Creates a custom date string by replacing the following with a specific part of the date:
     * `%W` - week; `%Y` - year; `%M` - month; `%D` - day; `%h` - hours; `%m` - minutes; `%s` - seconds
     * @param date A date object (or millis) of which string representation you want to create
     * @param template A template string using % characters
     * @param timeZone Your timezone (uses Europe/Warsaw by default)
     */
    export function genDateString(date: Date | string | number, template: string, timeZone = "Europe/Warsaw") {
        let a = new Date(date).toLocaleString('en-US', <any> {timeZone, hourCycle: "h23", weekday: 'long', year: 'numeric', month: '2-digit', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit'})
                        .split(', ').map((v, i) => !i && v || i == 1 && v.split('/') || v.split(':')).flat();
        
        for(let i = 0, p = '%W %M %D %Y %h %m %s'.split(' '); i < a.length; i++)
            template = template.replace(new RegExp(p[i], 'g'), a[i]);

        return template;
    }
}

export default Utils;