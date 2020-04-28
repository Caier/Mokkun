import { MessageEmbed, StringResolvable, MessageEmbedOptions, EmbedFieldData, EmbedField } from 'discord.js';
export declare class SafeEmbed extends MessageEmbed {
    overFields: EmbedField[];
    static max: {
        author: number;
        description: number;
        title: number;
        footerText: number;
        fields: number;
        fieldName: number;
        fieldValue: number;
    };
    constructor(data?: MessageEmbed | MessageEmbedOptions);
    private shortenFields;
    setAuthor(name: StringResolvable, iconURL?: string, url?: string): this;
    setDescription(description: StringResolvable): this;
    setTitle(title: StringResolvable): this;
    setFooter(text: StringResolvable, iconURL?: string): this;
    addFields(...fields: EmbedFieldData[] | EmbedFieldData[][]): this;
    spliceFields(index: number, deleteCount: number, ...fields: EmbedFieldData[] | EmbedFieldData[][]): this;
    static normalizeField(name: StringResolvable, value: StringResolvable, inline?: boolean): Required<EmbedFieldData>;
    static normalizeFields(...fields: EmbedFieldData[] | EmbedFieldData[][]): Required<EmbedFieldData>[];
}
//# sourceMappingURL=SafeEmbed.d.ts.map