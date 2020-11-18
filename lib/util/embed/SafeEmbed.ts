import { MessageEmbed, StringResolvable, Util, MessageEmbedOptions, EmbedFieldData, EmbedField } from 'discord.js';

export class SafeEmbed extends MessageEmbed {
    overFields: EmbedField[] = [];

    static max = {
        author: 256,
        description: 2048,
        title: 256,
        footerText: 2048,
        fields: 25,
        fieldName: 256,
        fieldValue: 1024
    }
    
    constructor(data?: MessageEmbed | MessageEmbedOptions) {
        super(data);
    }

    private shortenFields() {
        if(this.fields.length >= SafeEmbed.max.fields) {
            let over = this.fields.slice(SafeEmbed.max.fields);
            this.fields = this.fields.slice(0, SafeEmbed.max.fields);
            this.overFields.push(...over);
        }
    }

    populateEmbeds(max = SafeEmbed.max.fields, embs: SafeEmbed[] = [], level = 1) : SafeEmbed[] {
        if(max != SafeEmbed.max.fields && level == 1)
            this.overFields.unshift(...this.fields.splice(max));
        if(this.overFields.length == 0)
            return embs;
        if(!embs.length)
            return this.populateEmbeds(max, [this.setFooter(`Strona 1/${Math.ceil(1 + this.overFields.length / max)}`)], ++level);
        embs.push(new SafeEmbed(this).setFooter(`Strona ${level}/${embs.length + Math.ceil(this.overFields.length / max)}`));
        embs[embs.length - 1].fields = this.overFields.splice(0, max);
        return this.populateEmbeds(max, embs, ++level);
    }

    setAuthor(name: StringResolvable, iconURL?: string, url?: string) {
        name = Util.resolveString(name).slice(0, SafeEmbed.max.author);
        return super.setAuthor(name, iconURL, url);
    }

    setDescription(description: StringResolvable) {
        description = Util.resolveString(description).slice(0, SafeEmbed.max.description);
        return super.setDescription(description);
    }

    setTitle(title: StringResolvable) {
        title = Util.resolveString(title).slice(0, SafeEmbed.max.title);
        return super.setTitle(title);
    }

    setFooter(text: StringResolvable, iconURL?: string) {
        text = Util.resolveString(text).slice(0, SafeEmbed.max.footerText);
        return super.setFooter(text, iconURL);
    }

    addField(name: StringResolvable, value: StringResolvable, inline?: boolean) {
        super.addField(name, value, inline);
        this.shortenFields();
        return this;
    }

    addFields(...fields: EmbedFieldData[] | EmbedFieldData[][]) {
        super.addFields(...fields);
        this.shortenFields();
        return this;
    }

    spliceFields(index: number, deleteCount: number, ...fields: EmbedFieldData[] | EmbedFieldData[][]) {
        super.spliceFields(index, deleteCount, ...fields);
        this.shortenFields();
        return this;
    }

    static normalizeField(name: StringResolvable, value: StringResolvable, inline?: boolean) {
        name = Util.resolveString(name).slice(0, SafeEmbed.max.fieldName);
        value = Util.resolveString(value).slice(0, SafeEmbed.max.fieldValue);
        return super.normalizeField(name, value, inline);
    }
}