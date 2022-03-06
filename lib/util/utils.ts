import Discord, { TextChannel, MessageReaction, User, CollectorOptions, MessageEmbed, DMChannel, ReactionCollector, Message, ColorResolvable, ReactionCollectorOptions, TextBasedChannel, Formatters, MessageOptions, Util, MessageActionRow, MessageButton, MessageComponentCollectorOptions, MessageComponentInteraction, MessageSelectMenu } from 'discord.js';
import fs from 'fs-extra';
import path from 'path';
import { SafeEmbed } from './embed/SafeEmbed';

namespace Utils {
    export const regexes = {
        url: /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/
    }

    export async function send(channel: TextBasedChannel, content?: string | MessageEmbed, options?: MessageOptions & { split?: boolean, code?: string }) {
        if(content instanceof MessageEmbed)
            return await channel.send({ ...options, embeds: [content] });
        if(options?.split) {
            let msgs = Util.splitMessage(content, { maxLength: 1990 });
            if(options?.code)
                msgs = msgs.map(m => Formatters.codeBlock(options.code, m));
            let lastM: Message;
            for(let m of msgs)
                lastM = await channel.send({ content: m, ...options });
            return lastM;
        }
        else if(options?.code)
            return await channel.send({ content: Formatters.codeBlock(options.code, content), ...options });
        return await channel.send({ content, ...options });
    }

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
    * @param pages Array of MessageEmbeds or array of Promises resolving in MessageEmbed or array of async functions resolving in MessageEmbed
    * @param opts (optional) object with additional options
    * @param opts.triggers Who should trigger the collector (Array of UserIDs)
    * @param opts.emojis Which emojis to use as buttons (Default: ['⏪', '◀', '▶', '⏩', '❌'])
    * @param opts.toEdit Instead of sending a new message, which existing one should be made into a page selector?
    * @param opts.disableMenu Should the MessageSelectMenu be disabled? (default false)
    * @param opts.collOpts Options of the MessageComponentCollector
    * @returns [collector, message to which collector is attached]
    */
    export async function createPageSelector(ctx: TextChannel | DMChannel | Message, pages: (MessageEmbed | string)[] | Promise<(MessageEmbed | string)>[] | (() => Promise<(MessageEmbed | string)>)[],
    opts?: {triggers?: string[], emojis?: string[], disableMenu?: boolean, collOpts?: MessageComponentCollectorOptions<MessageComponentInteraction>}) {
        let cache: (MessageEmbed | string)[] = [];
        const getPage: (arg0: number) => Promise<MessageEmbed> = async (i: number) => cache[i] || (cache[i] = typeof pages[i] == 'function' && await (pages[i] as any)() || await pages[i]);
        const decide = (c: string | MessageEmbed) => ({ embeds: typeof c == 'string' ? [] : [c], content: typeof c == 'string' ? c : null });
        let emojis = opts?.emojis || ['⏪', '◀', '▶', '⏩', '❌'];
        let components = [new MessageActionRow().addComponents(emojis.map((e, i) => e && new MessageButton().setCustomId(''+i).setEmoji(e).setStyle("SECONDARY").setDisabled(i < 2)).filter(Boolean))];
        if(!opts?.disableMenu) {
            let perOption = Math.ceil(pages.length / 25);
            components.unshift(new MessageActionRow().addComponents(new MessageSelectMenu().setCustomId('menu').setPlaceholder(`Strona 1/${pages.length}`)
                .setOptions(Array(Math.floor(pages.length / perOption)).fill(0).map((_, i) => ({ label: 'Strona '+ ((i * perOption) + 1), value: ''+ i * perOption })))));
        }
        let nmsg = ctx instanceof Message ? await ctx.edit({ ...decide(await getPage(0)), components }) : await ctx.send({ ...decide(await getPage(0)), components });
        let curPage = 0;

        let coll = nmsg.createMessageComponentCollector({ 
            ...(opts?.collOpts || { idle: 600_000 })
        }).on('collect', async int => {
            if(opts?.triggers && !opts.triggers.includes(int.user.id)) {
                await int.reply({ embeds: [new SafeEmbed().setAuthor('Nie jesteś użytkownikiem, który może kontrolować tą wiadomość.').setColor("WHITE")], ephemeral: true })
                return;
            }

            const edit = async (page: number) => {
                if(!opts?.disableMenu)
                    (components[0].components[0] as MessageSelectMenu).setPlaceholder(`Strona ${curPage + 1}/${pages.length}`);
                components.forEach(row => row.components.forEach(c => c.setDisabled(false)));
                for(let c of components[opts?.disableMenu ? 0 : 1].components)
                    switch(+c.customId) {
                        case 0: case 1: curPage == 0 && c.setDisabled(true); break;
                        case 2: case 3: curPage == pages.length - 1 && c.setDisabled(true);
                    }
                await nmsg.edit({ ...decide(await getPage(page)), components });
            };

            components.forEach(row => row.components.forEach(c => c.setDisabled(true)));
            await int.update({ components });
            if(int.isButton())
                switch(+int.customId) {
                    case 0: (curPage = 0) || await edit(0); break;
                    case 1: curPage > 0 && await edit(--curPage); break;
                    case 2: curPage < pages.length - 1 && await edit(++curPage); break;
                    case 3: (curPage = pages.length - 1) && await edit(pages.length - 1); break;
                    case 4: coll.stop(); nmsg.delete();
                }
            else if(int.isSelectMenu())
                await edit(curPage = +int.values[0]);
        }).on('end', async () => {
            components.forEach(row => row.components.forEach(c => c.setDisabled(true)));
            await nmsg.edit({ components }).catch(()=>{});
        }).on('error', err => {
            if(process.env.DEBUG)
                console.error(err);
            nmsg.edit({ embeds: [new SafeEmbed().setAuthor('Caught an exception in the page selector:').setDescription(err.toString())] }).catch(()=>{});
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
     * @param opts Additional options
     * @param opts.for The user who needs to respond
     * @param opts.color Color of the embed
     * @param opts.time Time to answer in milliseconds
     * @param opts.buttons What should be presented in the buttons
     * @returns `true` if user answered yes, `false` if user answered no or timed out
     */
    export function confirmBox(ctx: TextChannel | DMChannel | Message, question: string | MessageEmbed, opts?: { for?: User, color?: ColorResolvable, time?: number, buttons?: [string, string] | [MessageButton, MessageButton] }) {
        return new Promise<boolean>(async res => {
            const components = [new MessageActionRow().addComponents(opts?.buttons?.[0] instanceof MessageButton ? opts.buttons as MessageButton[] : [
                new MessageButton().setCustomId('y').setStyle('SUCCESS').setLabel(opts?.buttons?.[0] as string ?? 'Confirm'),
                new MessageButton().setCustomId('n').setStyle('DANGER').setLabel(opts?.buttons?.[1] as string ?? 'Cancel')
            ])];
            const ctn = { components, embeds: [question instanceof MessageEmbed ? question : 
                new SafeEmbed().setAuthor('Attention!').addField('Decides:', opts?.for?.tag ?? 'Anyone').setDescription(question).setColor(opts?.color ?? '#bc0000').setFooter('Decide, using buttons below')
            ]};
            const msg = ctx instanceof Message ? await ctx.edit(ctn) : await ctx.send(ctn);
            
            const coll = msg.createMessageComponentCollector({ time: opts?.time ?? 120_000, componentType: 'BUTTON' }).on('collect', async int => {
                if(opts?.for && int.user.id != opts.for.id) {
                    int.reply({ ephemeral: true, content: 'That question isn\'t for you to decide' });
                    return;
                }

                const answer = int.customId == components[0].components[0].customId;
                res(answer);
                coll.stop('answered');
            }).on('end', (_, reason) => {
                if(reason == 'answered' && !(ctx instanceof Message))
                    msg.delete().catch(()=>{});
                else if(reason != 'answered') {
                    msg.edit({ components: [], embeds: [msg.embeds[0].setFooter({text: 'No option has been chosen.'})] }).catch(()=>{});
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