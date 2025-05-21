import { MessageEmbed, StringResolvable, Util, MessageEmbedOptions, EmbedFieldData, EmbedField } from 'discord.js';

export class SafeEmbed extends MessageEmbed {
    overFields : EmbedField[] = [];

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

    static normalizeFields(...fields: EmbedFieldData[] | EmbedFieldData[][]) {
        return super.normalizeFields(...fields).slice(0, SafeEmbed.max.fields);
    }
}