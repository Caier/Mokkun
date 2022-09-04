import { APIApplicationCommandIntegerOption, APIApplicationCommandNumberOption, ApplicationCommandNumericOption, ApplicationCommandOptionType, BaseInteraction, CacheType, ChatInputApplicationCommandData, ChatInputCommandInteraction, Collection, ColorResolvable, CommandInteraction, DiscordAPIError, DMChannel, Guild, GuildMember, InteractionDeferReplyOptions, InteractionReplyOptions, InteractionResponse, Message, MessageEditOptions, MessageMentions, MessagePayload, ReplyMessageOptions, RGBTuple, TextChannel, User, WebhookEditMessageOptions } from "discord.js";
import { Mokkun } from "../../mokkun.js";
import SafeEmbed from "../embed/SafeEmbed.js";
import { SilentError, LoggedError } from "../errors/errors.js";
import { ICommand } from "./ICommand.js";

export default abstract class Context {
    readonly options = new Collection<string | number, any>();
    readonly args: any[] = [];

    abstract get replied(): boolean;

    isInteraction(): this is InteractionContext {
        return this instanceof InteractionContext;
    }

    isMessage(): this is MessageContext {
        return this instanceof MessageContext;
    }

    constructor(readonly command: ICommand,
                readonly bot: Mokkun,
                readonly prefix: string,
                readonly channel: TextChannel | DMChannel, 
                readonly user: User, 
                readonly member?: GuildMember, 
                readonly guild?: Guild) {};

    abstract deferReply(opts: { fetchReply: true }): Promise<Message>;
    abstract deferReply(opts?: { fetchReply: boolean }): Promise<InteractionResponse | void>;
    abstract deleteReply(): Promise<void>;
    abstract editReply(opts: string | MessagePayload | WebhookEditMessageOptions | MessageEditOptions): Promise<Message>;
    abstract fetchReply(): Promise<Message>;
    abstract followUp(opts: string | MessagePayload | Omit<InteractionReplyOptions, 'ephemeral'> | ReplyMessageOptions): Promise<Message>;
    abstract reply(opts: (Omit<InteractionReplyOptions, 'ephemeral'> | ReplyMessageOptions) & { fetchReply: true }): Promise<Message>;
    abstract reply(opts: string | MessagePayload | Omit<InteractionReplyOptions, 'ephemeral'> | ReplyMessageOptions): Promise<InteractionResponse | void>;

    async handleError(err: any) {
        if(err instanceof SilentError || err instanceof LoggedError)
            return;
        if(process.env.DEBUG)
            console.log(err);
        const msg = { embeds: [SafeEmbed.quick(`**Napotkano na błąd podczas wykonywania tej komendy :(**\n${err}`)] };
        try {
            if(this.replied)
                await this.followUp(msg);
            else 
                await this.reply(msg);
        }
        catch(_) {
            this.channel.send(msg).catch(()=>{});
        }
    }
}

export class InteractionContext extends Context {
    get replied(): boolean {
        return this.int.replied;    
    }

    constructor(readonly int: ChatInputCommandInteraction, command: ICommand, bot: Mokkun, prefix: string) {
        super(command, bot, prefix, int.channel as TextChannel, int.user, int.member as GuildMember, int.guild ?? void 0);
        this.parseSlashArgs(int.options);
    }

    private parseSlashArgs(args: CommandInteraction['options']) {
        for(let option of this.command.options || []) {
            let resOpt = args.get(option.name);
            if(typeof resOpt == 'undefined' || typeof resOpt == 'object' && !resOpt)
                continue;
            this.args.push(resOpt?.member || resOpt?.user || resOpt?.channel || resOpt?.role || resOpt?.value);
            this.options.set(option.name, resOpt?.member || resOpt?.user || resOpt?.channel || resOpt?.role || resOpt?.value);
        }
    }

    async deferReply(opts: InteractionDeferReplyOptions & { fetchReply: true; }): Promise<Message>;
    async deferReply(opts?: InteractionDeferReplyOptions): Promise<InteractionResponse>;
    async deferReply(opts?: InteractionDeferReplyOptions): Promise<Message | InteractionResponse> {
        return await this.int.deferReply(opts);
    }

    async deleteReply(): Promise<void> {
        return await this.int.deleteReply();
    }

    async editReply(opts: string | MessagePayload | WebhookEditMessageOptions): Promise<Message> {
        return await this.int.editReply(opts);
    }

    async fetchReply(): Promise<Message> {
        return await this.int.fetchReply();
    }

    async followUp(opts: string | MessagePayload | InteractionReplyOptions): Promise<Message> {
        return await this.int.followUp(opts);
    }

    async reply(opts: InteractionReplyOptions & { fetchReply: true; }): Promise<Message>;
    async reply(opts: string | InteractionReplyOptions | MessagePayload): Promise<InteractionResponse>;
    async reply(opts: string | InteractionReplyOptions & { fetchReply: boolean } | MessagePayload): Promise<Message | InteractionResponse> {
        return await this.int.reply(opts);
    }
}

export class MessageContext extends Context {
    private static readonly UsersPattern = new RegExp(MessageMentions.UsersPattern, 'g');
    private static readonly ChannelsPattern = new RegExp(MessageMentions.ChannelsPattern, 'g');
    private static readonly RolesPattern = new RegExp(MessageMentions.RolesPattern, 'g');

    private _reply?: Message;
    private _deferred = false;

    get replied(): boolean {
        return !!this._reply;    
    }

    constructor(readonly msg: Message, command: ICommand, bot: Mokkun, prefix: string) {
        super(command, bot, prefix, msg.channel as TextChannel, msg.author, msg.member ?? void 0, msg.guild ?? void 0);
        this.parseRegularArgs(this.msg.content);
    }

    private parseRegularArgs(args: string) {
        let scope = this.bot.commands.commands.get(args.slice(this.prefix.length).split(' ').shift()!.trim());
        let tempargs = MessageContext.getArgs(args, { scope, prefix: this.prefix, ...this.command.argOpts });
        
        if(this.command.options) {
            this.command.options.forEach((option, i) => {
                let notset = false;
                const err = () => {
                    if(option.required) 
                        throw Error(`Command parsing error: Expected ${ApplicationCommandOptionType[option.type]} at position ${i}`);
                    tempargs.shift();
                    notset = true;
                }

                if(option.type == ApplicationCommandOptionType.String) {
                    if(!tempargs[0]?.length)
                        err();
                    else if(!('choices' in option) || (option.choices?.length && option.choices.map(c => c.value).includes(tempargs[0])))
                        this.args.push(tempargs.shift());
                    else if('choices' in option && option.choices)
                        throw Error(`Command parsing error: Expected ${ApplicationCommandOptionType[option.type]} at position ${i} to be one of: \`${option.choices.map(c => c.value).join(', ')}\`, instead got ${tempargs[0]}`);
                }
                else if(option.type == ApplicationCommandOptionType.Integer) {
                    type N = APIApplicationCommandIntegerOption;
                    if(Number.isInteger(+tempargs[0])) {
                        if('choices' in option && option.choices?.length && !option.choices.map(c => c.value).includes(+tempargs[0]))
                            throw Error(`Command parsing error: Expected ${ApplicationCommandOptionType[option.type]} at position ${i} to be one of: \`${option.choices.map(c => c.value).join(', ')}\`, instead got ${tempargs[0]}`);
                        if(+tempargs[0] >= ((option as N).min_value ?? -Infinity) && +tempargs[0] <= ((option as N).max_value ?? Infinity))
                            this.args.push(+tempargs.shift()!);
                        else
                           throw Error(`Command parsing error: ${ApplicationCommandOptionType[option.type]} at position ${i} must be >= than ${(option as N).min_value} and <= than ${(option as N).max_value}`);
                    }
                    else
                        err();
                } 
                else if(option.type == ApplicationCommandOptionType.Boolean) {
                    if(['True', 'true'].includes(tempargs[0])) {
                        tempargs.shift();
                        this.args.push(true);
                    } else if(['False', 'false'].includes(tempargs[0])) {
                        tempargs.shift();
                        this.args.push(false);
                    } else
                        err();
                } 
                else if(option.type == ApplicationCommandOptionType.User) {
                    if([...(tempargs[0] || '')?.matchAll(MessageContext.UsersPattern)][0]?.[1])
                        this.args.push(this.msg.mentions[this.msg.guild ? 'members' : 'users']!.get([...tempargs.shift()!.matchAll(MessageContext.UsersPattern)][0][1]));
                    else
                        err();
                }
                else if(option.type == ApplicationCommandOptionType.Channel) {
                    if([...(tempargs[0] || '')?.matchAll(MessageContext.ChannelsPattern)][0]?.[1])
                        this.args.push(this.msg.mentions.channels.get([...tempargs.shift()!.matchAll(MessageContext.ChannelsPattern)][0][1]));
                    else
                        err();
                }
                else if(option.type == ApplicationCommandOptionType.Role) {
                    if([...(tempargs[0] || '')?.matchAll(MessageContext.RolesPattern)][0]?.[1])
                        this.args.push(this.msg.mentions.roles.get([...tempargs.shift()!.matchAll(MessageContext.RolesPattern)][0][1]));
                    else
                        err();
                }
                else if(option.type == ApplicationCommandOptionType.Mentionable) {
                    if([...(tempargs[0] || '')?.matchAll(MessageContext.RolesPattern)][0]?.[1])
                        this.args.push(this.msg.mentions.roles.get([...tempargs.shift()!.matchAll(MessageContext.RolesPattern)][0][1]));
                    else if([...(tempargs[0] || '')?.matchAll(MessageContext.UsersPattern)][0]?.[1])
                        this.args.push(this.msg.mentions[this.msg.guild ? 'members' : 'users']!.get([...tempargs.shift()!.matchAll(MessageContext.UsersPattern)][0][1]));
                    else
                        err();
                }
                else if(option.type == ApplicationCommandOptionType.Number) {
                    type N = APIApplicationCommandNumberOption;
                    if(!isNaN(+tempargs[0])) {
                        if('choices' in option && option.choices?.length && !option.choices.map(c => c.value).includes(+tempargs[0]))
                            throw Error(`Command parsing error: Expected ${ApplicationCommandOptionType[option.type]} at position ${i} to be one of: \`${option.choices.map(c => c.value).join(', ')}\`, instead got ${tempargs[0]}`);
                        if(+tempargs[0] >= ((option as N).min_value ?? -Infinity) && +tempargs[0] <= ((option as N).max_value ?? Infinity))
                            this.args.push(+tempargs.shift()!);
                        else
                           throw Error(`Command parsing error: ${ApplicationCommandOptionType[option.type]} at position ${i} must be >= than ${(option as N).min_value ?? -Infinity} and <= than ${(option as N).max_value ?? Infinity}`);
                    }
                    else
                        err();
                }
                else
                    tempargs.shift();

                if(!notset)
                    this.options.set(option.name, this.args[this.args.length - 1]);
            });
        } else {
            this.args.push(...tempargs);
            this.args.forEach((a, i) => this.options.set(i, a));
        }
    }

    static getArgs(ctn: string, opts: ICommand['argOpts'] & { prefix?: string, scope?: ICommand }) {
        let content: string | string[] = ctn.slice(opts?.prefix?.length || 0);
        let args = [];
        if(opts?.splitter) 
            content = content.split(opts?.splitter);
        args.push(...((opts?.splitter ? content[0] : content) as string).split(" ").map(v => v.trim()).filter(v => v != " " && v != ""));
        if(opts?.scope) {
            args.shift();
            for(let a of args)
                if(opts.scope!!.subcommands?.has(a)) {
                    args.shift();
                    opts.scope = opts.scope!!.subcommands.get(a);
                }
                else break;
        }
        if(typeof opts?.free == 'number')
            args = [...args.slice(0, opts.free), args.slice(opts.free).join(" ")];
        if(opts?.splitter)
            args.push(...(content as string[]).slice(1).map(v => v.trim()));
        
        return args;
    }

    async deferReply(opts: { fetchReply: true }): Promise<Message>;
    async deferReply(opts?: { fetchReply: boolean }): Promise<void>;
    async deferReply(opts?: { fetchReply: boolean }): Promise<Message | void> {
        if(!this._reply) {
            this._deferred = true;
            this._reply = await this.msg.reply({ allowedMentions: { repliedUser: false }, content: `${this.bot.user?.username} is thinking...`});
        }
        else
            throw Error('The reply to this message has already been sent or deferred.');

        if(opts?.fetchReply)
            return this._reply;
    }

    async deleteReply(): Promise<void> {
        if(this._reply)
            await this._reply.delete();
        else
            throw Error('The reply to this message has not been sent or deferred. (deleteReply)');
    }

    async editReply(opts: string | MessagePayload | MessageEditOptions): Promise<Message> {
        if(this._reply) {
            if(this._deferred && !(opts as any).content)
                (opts as any).content = null;
            this._deferred = false;
            return await this._reply.edit({ ...(typeof opts == 'string' ? { content: opts } : opts as MessageEditOptions), allowedMentions: { repliedUser: false } });
        }
        else
            throw Error('The reply to this message has not been sent or deferred. (editReply)');
    }

    async fetchReply(): Promise<Message> {
        if(this._reply)
            return this._reply;
        else
            throw Error('The reply to this message has not been sent or deferred. (fetchReply)');
    }

    async followUp(opts: string | MessagePayload | ReplyMessageOptions): Promise<Message> {
        if(this._deferred) {
            this._deferred = false;
            return await this._reply!.edit({ ...(typeof opts == 'string' ? { content: opts } : opts as MessageEditOptions), allowedMentions: { repliedUser: false } });
        } 
        else if(this._reply)
            return await this._reply.reply({ ...(typeof opts == 'string' ? { content: opts } : opts as ReplyMessageOptions), allowedMentions: { repliedUser: false } });
        else
            throw Error('The reply to this message has not been sent or deferred. (followUp)');
    }

    async reply(opts: ReplyMessageOptions & { fetchReply: true; }): Promise<Message>;
    async reply(opts: string | MessagePayload | ReplyMessageOptions): Promise<void>;
    async reply(opts: string | MessagePayload | ReplyMessageOptions & { fetchReply: boolean }): Promise<Message | void> {
        if(!this._reply)
            this._reply = await this.msg.reply({ ...(typeof opts == 'string' ? { content: opts } : opts as ReplyMessageOptions), allowedMentions: { repliedUser: false } });
        else 
            throw Error('The reply to this message has already been sent or deferred.');
        
        if(typeof opts != 'string' && 'fetchReply' in opts && opts.fetchReply)
            return this._reply;
    }
};