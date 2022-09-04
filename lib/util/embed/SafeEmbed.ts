import { normalizeArray } from '@discordjs/builders';
import { APIEmbed } from 'discord-api-types/v10';
import { JSONEncodable, RestOrArray, ColorResolvable, resolveColor } from 'discord.js';
import { Mokkun } from '../../mokkun.js';

export default class SafeEmbed implements JSONEncodable<APIEmbed> {
    readonly data: APIEmbed = {};
    readonly validation: 'cut' | 'throw';

    static readonly max = {
        author: 256,
        description: 4096,
        title: 256,
        footerText: 2048,
        fields: 25,
        fieldName: 256,
        fieldValue: 1024
    }

    constructor(validation?: SafeEmbed['validation']);
    constructor(from: SafeEmbed | APIEmbed);
    constructor(param: SafeEmbed['validation'] | SafeEmbed | APIEmbed = 'cut') {
        if(typeof param == 'string')
            this.validation = param;
        else if(param instanceof SafeEmbed) {
            this.data = JSON.parse(JSON.stringify(param.data));
            this.validation = param.validation;
        } else {
            this.data = JSON.parse(JSON.stringify(param));
            this.validation = 'cut';
        }
    }

    private validateLength<T extends string | any[]>(what: T, max: number): T {
        if(this.validation == 'cut')
            return (what.length > max) ? what.slice(0, max) as T : what;
        else if(this.validation == 'throw' && what.length > max)
            throw Error(`SafeEmbed property excceds the maximum length: ${max}`);
        return what;
    }

    populateEmbeds(maxFields = SafeEmbed.max.fields, pageCountInFoot = true, template: SafeEmbed | APIEmbed = this): SafeEmbed[] {
        let overFields = this.data.fields?.splice(maxFields) ?? [], count = Math.ceil(1 + (overFields?.length ?? 0) / maxFields);
        let embeds: SafeEmbed[] = [pageCountInFoot ? this.setFooter(`${1}/${count}`) : this];
        for(let i = 2; overFields?.length; ++i) {
            let emb = new SafeEmbed(template).setFields(...overFields.splice(0, maxFields));
            if(pageCountInFoot)
                emb.setFooter(`${i}/${count}`);
            embeds.push(emb);
        }
        return embeds;
    }

    addFields(...fields: RestOrArray<Exclude<APIEmbed['fields'], undefined>[0]>) {
        fields = normalizeArray(fields);
        for(const f of fields) {
            f.name = this.validateLength(f.name, SafeEmbed.max.fieldName);
            f.value = this.validateLength(f.value, SafeEmbed.max.fieldValue);
        }
        if(this.data.fields)
            this.data.fields.push(...fields);
        else
            this.data.fields = fields;
        if(this.validation == 'throw')
            this.validateLength(this.data.fields, SafeEmbed.max.fields);
        return this;
    }

    spliceFields(index: number, deleteCount: number, ...fields: RestOrArray<Exclude<APIEmbed['fields'], undefined>[0]>) {
        fields = normalizeArray(fields);
        for(const f of fields) {
            f.name = this.validateLength(f.name, SafeEmbed.max.fieldName);
            f.value = this.validateLength(f.value, SafeEmbed.max.fieldValue);
        }
        if(this.data.fields)
            this.data.fields.splice(index, deleteCount, ...fields);
        else
            this.data.fields = fields;
        if(this.validation == 'throw')
            this.validateLength(this.data.fields, SafeEmbed.max.fields);
        return this;
    }

    addField(name: string, value: string, inline?: boolean) {
        return this.addFields({ name, value, inline });
    }

    setFields(...fields: RestOrArray<Exclude<APIEmbed['fields'], undefined>[0]>) {
        return this.spliceFields(0, this.data.fields?.length ?? 0, ...fields);
    }

    setAuthor(options: APIEmbed['author'] | null): this;
    setAuthor(name: string, iconURL?: string, url?: string): this;
    setAuthor(nameOrOpts: string | APIEmbed['author'] | null = null, iconURL?: string, url?: string): this {
        if(typeof nameOrOpts == 'string')
            this.data.author = { name: nameOrOpts, icon_url: iconURL, url };
        else if(nameOrOpts !== null)
            this.data.author = nameOrOpts;
        else {
            delete this.data.author;
            return this;
        }

        this.data.author.name = this.validateLength(this.data.author.name, SafeEmbed.max.author);
        return this;
    }

    setColor(color: ColorResolvable | null = null) {
        if(color === null)
            delete this.data.color;
        else 
            this.data.color = resolveColor(color);
        return this;
    }

    setDescription(desc: string | null = null) {
        if(desc === null)
            delete this.data.description;
        else
            this.data.description = this.validateLength(desc, SafeEmbed.max.description);
        return this;
    }

    setFooter(options: Omit<Exclude<APIEmbed['footer'], undefined>, 'proxy_icon_url'> | null): this;
    setFooter(text: string, iconUrl?: string): this;
    setFooter(textOrOpts: APIEmbed['footer'] | string | null = null, iconUrl?: string) {
        if(textOrOpts === null) {
            delete this.data.footer;
            return this;
        }
        else if(typeof textOrOpts == 'string')
            this.data.footer = { text: textOrOpts, icon_url: iconUrl };
        else
            this.data.footer = textOrOpts;

        this.validateLength(this.data.footer.text, SafeEmbed.max.footerText);
        return this;
    }

    setImage(url: string | null = null) {
        if(url === null)
            delete this.data.image;
        else
            this.data.image = { url };
        return this;
    }

    setThumbnail(url: string | null = null) {
        if(url === null)
            delete this.data.thumbnail;
        else
            this.data.thumbnail = { url };
        return this;
    }

    setTimestamp(time: number | Date | null = Date.now()) {
        if(time === null)
            delete this.data.timestamp;
        else
            this.data.timestamp = new Date(time).toISOString();
        return this;
    }

    setTitle(title: string | null = null) {
        if(title === null)
            delete this.data.title;
        else
            this.data.title = this.validateLength(title, SafeEmbed.max.title);
        return this;
    }

    setURL(url: string | null = null) {
        if(url === null)
            delete this.data.url;
        else
            this.data.url = url;
        return this;
    }

    toJSON() {
        return { ...this.data, fields: this.data.fields?.slice(0, SafeEmbed.max.fields) };
    }

    static quick(ctn: string, opts?: { in?: 'DESC'|'AUTHOR'|'TITLE', color?: ColorResolvable }) {
        return new this().setColor(opts?.color ?? Mokkun.sysColor).setAuthor((opts?.in == 'AUTHOR' || !opts?.in) ? ctn : '').setDescription(opts?.in == 'DESC' ? ctn : '').setTitle(opts?.in == 'TITLE' ? ctn : '');
    }
};