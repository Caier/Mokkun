import { group, aliases, register, CmdParams as c, nsfw, options, autocomplete } from "../../util/commands/cmdUtils";
import { fromGB, fromBooru, fromNH, gbRet } from '../../util/misc/searchMethods';
import Utils from "../../util/utils";
import { SafeEmbed } from "../../util/embed/SafeEmbed";
import { ColorResolvable, DMChannel, Message, MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu, TextChannel } from "discord.js";
import Context from "../../util/commands/Context";
import Task from "../../util/tasks/Task";
import { IBooru } from "../../util/interfaces/misc";
import ax from 'axios';

class ImageBoardEmbedHandler {
    private embeds: (MessageEmbed | string)[] = [];
    private msg: Message;

    constructor(
        private readonly ctx: Message | TextChannel | DMChannel,
        private readonly getPost: () => Promise<gbRet>,
        private readonly embedBuilder: (arg0: gbRet) => (MessageEmbed | string)[],
        private readonly color: ColorResolvable
    ) { this.initial() }

    private getFreshComponents(img: gbRet) {
        let components = [new MessageActionRow().addComponents([
            new MessageButton().setCustomId('ref').setStyle('SECONDARY').setEmoji('🔄'),
            new MessageButton().setCustomId('lock').setStyle('SECONDARY').setEmoji('🔒')
        ])];
        if(img.comments.length) {
            components.unshift(new MessageActionRow().addComponents([new MessageSelectMenu().setCustomId('sel').setPlaceholder('...').addOptions(Array(Math.ceil(img.comments.length / 10)).fill(0).map((_, i) => ({ label: `Comments page ${i + 1}`, value: ''+(i+1) })))]));
            (components[0].components[0] as MessageSelectMenu).spliceOptions(0, 0, { label: 'Embed', value: '0', default: true });
        }
        return components;
    }

    private async initial() {
        let post;
        try {
            post = await this.getPost();
        } catch (err) {
            if(!(this.ctx instanceof Message))
                return;
            const o = { embeds: [new SafeEmbed().setColor(this.color).setDescription('Error while fetching post: ' + (err as Error).message)], content: null as any };
            await this.ctx.edit(o);
            return;
        }
        if(!post) {
            const o = { embeds: [new SafeEmbed().setColor(this.color).setAuthor('No results')] };
            return this.ctx instanceof Message ? await this.ctx.edit(o) : await this.ctx.send(o)
        }
        this.embeds = this.embedBuilder(post);
        const options = { embeds: typeof this.embeds[0] == 'string' ? [] : [this.embeds[0]], content: typeof this.embeds[0] == 'string' ? this.embeds[0] : null, components: this.getFreshComponents(post) };
        this.msg = this.ctx instanceof Message ? await this.ctx.edit(options) : await this.ctx.send(options);
        this.attachCollector();
    }

    attachCollector() {
        let locked = false;
        let coll = this.msg.createMessageComponentCollector({ idle: Utils.parseTimeStrToMilis('1h') });
        coll.on('collect', async int => {
            this.msg.components.forEach(a => a.components.forEach(c => c.setDisabled(true)));
            await int.update({ components: this.msg.components });
            this.msg.components.forEach(a => a.components.forEach(c => c.setDisabled(c.customId == 'lock' && !!(c as MessageButton).label)));
            if(int.isSelectMenu()) {
                (this.msg.components[0].components[0] as MessageSelectMenu).options.forEach(o => o.default = o.value == int.values[0]);
                const sel = this.embeds[+int.values[0]];
                await this.msg.edit({ embeds: typeof sel == 'string' ? [] : [sel], content: typeof sel == 'string' ? sel : null, components: this.msg.components });
            }
            else if(int.customId == 'ref') {
                let post = await this.getPost();
                if(!locked) {
                    this.embeds = this.embedBuilder(post);
                    this.msg = await this.msg.edit({ embeds: typeof this.embeds[0] == 'string' ? [] : [this.embeds[0]], content: typeof this.embeds[0] == 'string' ? this.embeds[0] : null, components: this.getFreshComponents(post) });
                } else {
                    this.msg.components.slice(-1)[0].components.shift();
                    await this.msg.edit({ components: this.msg.components });
                    new ImageBoardEmbedHandler(this.msg.channel as any, this.getPost, this.embedBuilder, this.color);
                }
            }
            else {
                locked = true;
                (this.msg.components.slice(-1)[0].components[1].setDisabled(true) as MessageButton).setLabel('by ' + int.user.tag);
                await this.msg.edit({ components: this.msg.components });
            }
        });
        coll.on('error', err => { this.msg.reply({ embeds: [new SafeEmbed().setDescription('**Error in ImageBoardEmbedCollector:** ' + err.message)] }) });
    }
}

@nsfw
@group("NSFW")
export default class H {
    @register('gelbooru scraper', '', { free: 0 })
    @options({ type: 'STRING', name: 'search', description: 'the search query', autocomplete: true })
    @autocomplete(async int => {
        const q = (int.options.getString('search') ?? '').split(' ');
        let resp = await ax.get(`https://gelbooru.com/index.php?page=autocomplete2&term=${encodeURI(q.pop())}&type=tag_query`, { responseType: 'json' });
        return resp.data.map((r: any) => ({ name: q.join(' ') + ' ' + r.value, value: q.join(' ') + ' ' + r.value }));
    })
    static async gb(ctx: Context) {
        const color = "#006ffa";
        const q = ctx.options.get('search') as string ?? '';
        const sort = q.includes('sort:');
        const msg = await ctx.reply({ embeds: [ctx.emb('Searching', { color })], fetchReply: true });

        function imgToEmb(img: gbRet) {
            let embed = new SafeEmbed().setAuthor("Gelbooru", "https://pbs.twimg.com/profile_images/1118350008003301381/3gG6lQMl.png", "http://gelbooru.com/")
                .setColor(color).setURL(img.page).setImage(img.link).setTitle(!q ? 'random' : q)
                .setFooter(`ID: ${img.id}, Score: ${img.score}, Rating: ${img.rating}, Artist: ${img.artist}, Posted: ${img.posted}\nTags: ` + img.tags);
            img.comments.length && embed.addField(`${img.comments[0].name}:`, img.comments[0].comment);
            return embed;
        }

        if(sort)
            await Utils.createPageSelector(msg, (await fromGB(q, false)).map(i => async () => await i().then(img => img.tags == 'video' ? img.link : imgToEmb(img))), { emojis: ['⏪', '◀', '▶', '⏩'] });
        else
            new ImageBoardEmbedHandler(msg, async () => await (await fromGB(q))?.[0]?.(), img => {
                let embed = imgToEmb(img);
                let comb = new SafeEmbed().setTitle("Comments").setColor(color);
                img.comments.forEach(com => comb.addField(`${com.score}👍  ${com.name}:`, com.comment));
                return [img.tags == 'video' ? img.link : embed, ...comb.populateEmbeds(10)];
            }, color);
    }

    @register('scraper of different .boorus', '', { free: 1 })
    @aliases('b')
    @options({ type: 'STRING', name: 'name', description: 'the name of the booru', required: true, autocomplete: true },
             { type: 'STRING', name: 'search', description: 'the search query' })
    @autocomplete(int => {
        const boorus = Task.tasks.find(t => t.name == 'booruslist').ownData as IBooru[];
        const q = int.options.getString('name');
        let sugg: IBooru[] = [];
        sugg.push(...boorus.filter(b => b.name.toLowerCase().startsWith(q)));
        sugg.push(...boorus.filter(b => b.name.toLowerCase().includes(q) && !sugg.includes(b)));
        return sugg.slice(0, 25).map(b => ({ name: `${b.name} (${b.images} images)`, value: b.short }));
    })
    static async booru(ctx: Context) {
        const color = "#7750ff";
        new ImageBoardEmbedHandler(await ctx.reply({ embeds: [ctx.emb('Searching', { color })], fetchReply: true }), async () => (await fromBooru(ctx.args[0], ctx.args[1]))[0], img => {
            let embed = new SafeEmbed().setAuthor(ctx.args[0] == 'furry' ? 'furry.booru' : img.base.split('//')[1].split('.').slice(0, -1).join('.'), "https://cdn.discordapp.com/attachments/752238790323732494/833855293405265950/3gG6lQMl.png", img.base)
                        .setColor(color).setURL(img.page).setImage(img.link).setTitle(!ctx.args[1] ? 'random' : ctx.args[1])
                        .setFooter(`ID: ${img.id}, Score: ${img.score}, Rating: ${img.rating}, Artist: ${img.artist}, Posted: ${img.posted}\nTags: ` + img.tags);
            img.comments.length && embed.addField(`${img.comments[0].name}:`, img.comments[0].comment);
            let comb = new SafeEmbed().setTitle("Comments").setColor(color);
            img.comments.forEach(com => comb.addField(`${com.score}👍  ${com.name}:`, com.comment));
            return [img.tags == 'video' ? img.link : embed, ...comb.populateEmbeds(10)];
        }, color);
    }

    @aliases('nh')
    @register('you know what this is', '', { free: 0 })
    @options({ type: 'STRING', name: 'search', description: 'either a link, the famous number, or a search bar query'})
    static async nhentai(ctx: Context) {
        const query = ctx.options.get('search') as string;
        const color = 0xf40e29;
        let doujin = (query) 
        ? (/^[0-9]+$/.test(query)) 
            ? await fromNH("https://nhentai.net/g/" + query) 
            : (Utils.regexes.url.test(query)) 
                ? await fromNH(query)
                : await fromNH(null, query)
        : await fromNH();
       
        if(!doujin)
            return await ctx.reply({ embeds: [ctx.emb("No results", { color })] });

        let pages = [new SafeEmbed().setImage(doujin.thumb).setTitle(doujin.name).setURL(doujin.link).addField("Tags: ", doujin.tags).setColor(color).setAuthor("nhentai", "https://i.imgur.com/D7ryKWh.png")];
        for(let i = 1; i < doujin.maxPage; i++)
            pages.push(new SafeEmbed().setTitle(doujin.name).setURL(doujin.link + i).setColor(0xf40e29).setAuthor("nhentai", "https://i.imgur.com/D7ryKWh.png").setImage(
                `https://i.nhentai.net/galleries/${doujin.thumb.split("/").slice(4, -1).join("/")}/${i}.${doujin.format}`
            ));
        
        await Utils.createPageSelector(await ctx.reply({ fetchReply: true, embeds: [ctx.emb('Loading', { color })] }), pages);
    }
}