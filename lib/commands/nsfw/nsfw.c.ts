import { group, aliases, register, CmdParams as c, nsfw, options, autocomplete } from "../../util/commands/CommandDecorators.js";
import { fromGB, fromBooru, fromNH, gbRet } from '../../util/misc/searchMethods.js';
import Utils from "../../util/utils.js";
import SafeEmbed from "../../util/embed/SafeEmbed.js";
import { ActionRowBuilder, APIButtonComponentWithCustomId, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ColorResolvable, DMChannel, Message, RGBTuple, SelectMenuBuilder, TextChannel } from "discord.js";
import Context from "../../util/commands/Context.js";
import Task from "../../util/tasks/Task.js";
import { IBooru } from "../../util/interfaces/misc.js";
import ax from 'axios';
import { CommandGroup } from "../../util/commands/ICommand.js";

class ImageBoardEmbedHandler {
    private embeds: (SafeEmbed | string)[] = [];
    private msg!: Message;
    private components!: ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>[];

    constructor(
        private readonly ctx: Message | TextChannel | DMChannel,
        private readonly getPost: () => Promise<gbRet>,
        private readonly embedBuilder: (arg0: gbRet) => (SafeEmbed | string)[],
        private readonly color: number | RGBTuple
    ) { this.initial() }

    private getFreshComponents(img: gbRet) {
        let components: ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>[] = [new ActionRowBuilder<ButtonBuilder>().addComponents([
            new ButtonBuilder().setCustomId('ref').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
            new ButtonBuilder().setCustomId('lock').setStyle(ButtonStyle.Secondary).setEmoji('🔒')
        ])];
        if(img.comments.length) {
            components.unshift(new ActionRowBuilder<SelectMenuBuilder>().addComponents([new SelectMenuBuilder().setCustomId('sel').setPlaceholder('...').addOptions(Array(Math.ceil(img.comments.length / 10)).fill(0).map((_, i) => ({ label: `Comments page ${i + 1}`, value: ''+(i+1) })))]));
            (components[0].components[0] as SelectMenuBuilder).setOptions([{ label: 'Embed', value: '0', default: true }, ...(components[0].components[0] as SelectMenuBuilder).options]);
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
            this.ctx instanceof Message ? await this.ctx.edit(o) : await this.ctx.send(o);
            return;
        }
        this.embeds = this.embedBuilder(post);
        this.components = this.getFreshComponents(post);
        const options = { embeds: typeof this.embeds[0] == 'string' ? [] : [this.embeds[0]], content: typeof this.embeds[0] == 'string' ? this.embeds[0] : null, components: this.components };
        this.msg = this.ctx instanceof Message ? await this.ctx.edit(options) : await this.ctx.send(options);
        this.attachCollector();
    }

    attachCollector() {
        let locked = false;
        let coll = this.msg.createMessageComponentCollector({ idle: Utils.parseTimeStrToMilis('1h') });
        coll.on('collect', async int => {
            this.components.forEach(a => a.components.forEach(c => c.setDisabled(true)));
            await int.update({ components: this.components });
            this.components.forEach(a => a.components.forEach(c => c.setDisabled((c.data as APIButtonComponentWithCustomId).custom_id == 'lock' && !!(c as ButtonBuilder).data.label)));
            if(int.isSelectMenu()) {
                (this.components[0].components[0] as SelectMenuBuilder).options.forEach(o => o.setDefault(o.data.value == int.values[0]));
                const sel = this.embeds[+int.values[0]];
                await this.msg.edit({ embeds: typeof sel == 'string' ? [] : [sel], content: typeof sel == 'string' ? sel : null, components: this.components });
            }
            else if(int.customId == 'ref') {
                let post = await this.getPost();
                if(!locked) {
                    this.embeds = this.embedBuilder(post);
                    this.components = this.getFreshComponents(post);
                    this.msg = await this.msg.edit({ embeds: typeof this.embeds[0] == 'string' ? [] : [this.embeds[0]], content: typeof this.embeds[0] == 'string' ? this.embeds[0] : null, components: this.components });
                } else {
                    this.components.slice(-1)[0].components.shift();
                    await this.msg.edit({ components: this.components });
                    new ImageBoardEmbedHandler(this.msg.channel as any, this.getPost, this.embedBuilder, this.color);
                }
            }
            else {
                locked = true;
                (this.components.slice(-1)[0].components[1].setDisabled(true) as ButtonBuilder).setLabel('by ' + int.user.tag);
                await this.msg.edit({ components: this.components });
            }
        });
        coll.on('error', err => { this.msg.reply({ embeds: [new SafeEmbed().setDescription('**Error in ImageBoardEmbedCollector:** ' + err.message)] }); if(process.env.DEBUG) console.error(err); });
    }
}

@nsfw
@group(CommandGroup.NSFW)
export default class H {
    @register('gelbooru scraper', '', { free: 0 })
    @options({ type: ApplicationCommandOptionType.String, name: 'search', description: 'the search query', autocomplete: true })
    @autocomplete(async int => {
        const q = (int.options.getString('search') ?? '').split(' ');
        let resp = await ax.get(`https://gelbooru.com/index.php?page=autocomplete2&term=${encodeURI(q.pop() ?? '')}&type=tag_query`, { responseType: 'json' });
        return resp.data.map((r: any) => ({ name: q.join(' ') + ' ' + r.value, value: q.join(' ') + ' ' + r.value }));
    })
    static async gb(ctx: Context) {
        const color = 0x006ffa;
        const q = ctx.options.get('search') as string ?? '';
        const sort = q.includes('sort:');
        const msg = await ctx.reply({ embeds: [SafeEmbed.quick('Searching', { color })], fetchReply: true });

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
    @options({ type: ApplicationCommandOptionType.String, name: 'name', description: 'the name of the booru', required: true, autocomplete: true },
             { type: ApplicationCommandOptionType.String, name: 'search', description: 'the search query' })
    @autocomplete(int => {
        const boorus = Task.tasks.find(t => t.name == 'booruslist')!.ownData as IBooru[];
        const q = int.options.getString('name') ?? '';
        let sugg: IBooru[] = [];
        sugg.push(...boorus.filter(b => b.name.toLowerCase().startsWith(q)));
        sugg.push(...boorus.filter(b => b.name.toLowerCase().includes(q) && !sugg.includes(b)));
        return sugg.slice(0, 25).map(b => ({ name: `${b.name} (${b.images} images)`, value: b.short }));
    })
    static async booru(ctx: Context) {
        const color = 0x7750ff;
        new ImageBoardEmbedHandler(await ctx.reply({ embeds: [SafeEmbed.quick('Searching', { color })], fetchReply: true }), async () => (await fromBooru(ctx.args[0], ctx.args[1]))[0], img => {
            let embed = new SafeEmbed().setAuthor(ctx.args[0] == 'furry' ? 'furry.booru' : img.base!.split('//')[1].split('.').slice(0, -1).join('.'), "https://cdn.discordapp.com/attachments/752238790323732494/833855293405265950/3gG6lQMl.png", img.base)
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
    @options({ type: ApplicationCommandOptionType.String, name: 'search', description: 'either a link, the famous number, or a search bar query'})
    static async nhentai(ctx: Context) {
        const query = ctx.options.get('search') as string;
        const color = 0xf40e29;
        let doujin = (query) 
        ? (/^[0-9]+$/.test(query)) 
            ? await fromNH("https://nhentai.net/g/" + query) 
            : (Utils.regexes.url.test(query)) 
                ? await fromNH(query)
                : await fromNH(void 0, query)
        : await fromNH();
       
        if(!doujin)
            return await ctx.reply({ embeds: [SafeEmbed.quick("No results", { color })] });

        let pages = [new SafeEmbed().setImage(doujin.thumb).setTitle(doujin.name).setURL(doujin.link).addField("Tags: ", doujin.tags).setColor(color).setAuthor("nhentai", "https://i.imgur.com/D7ryKWh.png")];
        for(let i = 1; i < doujin.maxPage; i++)
            pages.push(new SafeEmbed().setTitle(doujin.name).setURL(doujin.link + i).setColor(0xf40e29).setAuthor("nhentai", "https://i.imgur.com/D7ryKWh.png").setImage(
                `https://i.nhentai.net/galleries/${doujin.thumb?.split("/").slice(4, -1).join("/")}/${i}.${doujin.format}`
            ));
        
        await Utils.createPageSelector(await ctx.reply({ fetchReply: true, embeds: [SafeEmbed.quick('Loading', { color })] }), pages);
    }
}