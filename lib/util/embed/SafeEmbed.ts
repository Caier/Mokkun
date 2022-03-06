import { MessageEmbed, MessageEmbedOptions, EmbedFieldData, EmbedField, EmbedAuthorData, EmbedFooterData } from 'discord.js';

export class SafeEmbed extends MessageEmbed {
    overFields: EmbedField[] = [];

    static max = {
        author: 256,
        description: 4096,
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
        if(!embs.length)
            return this.populateEmbeds(max, [this.setFooter(`Strona 1/${Math.ceil(1 + this.overFields.length / max)}`)], ++level);
        if(this.overFields.length == 0)
            return embs;
        embs.push(new SafeEmbed(this).setFooter(`Strona ${level}/${embs.length + Math.ceil(this.overFields.length / max)}`));
        embs[embs.length - 1].fields = this.overFields.splice(0, max);
        return this.populateEmbeds(max, embs, ++level);
    }

    setAuthor(options: EmbedAuthorData | null): this;
    setAuthor(name: string, iconURL?: string, url?: string): this;
    setAuthor(nameOrOpts: string | EmbedAuthorData, iconURL?: string, url?: string) {
        if(typeof nameOrOpts == 'string') {
            nameOrOpts = nameOrOpts.slice(0, SafeEmbed.max.author);
            return super.setAuthor({ name: nameOrOpts, iconURL, url });
        }

        nameOrOpts.name = nameOrOpts.name.slice(0, SafeEmbed.max.author);
        return super.setAuthor(nameOrOpts);
    }

    setDescription(description: string) {
        description = description.slice(0, SafeEmbed.max.description);
        return super.setDescription(description);
    }

    setTitle(title: string) {
        title = title.slice(0, SafeEmbed.max.title);
        return super.setTitle(title);
    }

    setFooter(options: EmbedFooterData | null): this;
    setFooter(text: string, iconURL?: string): this;
    setFooter(textOrOpts: string | EmbedFooterData, iconURL?: string) {
        if(typeof textOrOpts == 'string') {
            textOrOpts = textOrOpts.slice(0, SafeEmbed.max.footerText);
            return super.setFooter({ text: textOrOpts, iconURL });
        }
        textOrOpts.text = textOrOpts.text.slice(0, SafeEmbed.max.footerText);
        return super.setFooter(textOrOpts);
    }

    addField(name: string, value: string, inline?: boolean) {
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

    static normalizeField(name: string, value: string, inline?: boolean) {
        name = name.slice(0, SafeEmbed.max.fieldName);
        value = value.slice(0, SafeEmbed.max.fieldValue);
        return super.normalizeField(name, value, inline);
    }
}