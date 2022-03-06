import { ApplicationCommandNumericOption, Collection, ColorResolvable, CommandInteraction, DiscordAPIError, DMChannel, Guild, GuildMember, InteractionDeferReplyOptions, InteractionReplyOptions, Message, MessageMentions, MessagePayload, TextChannel, User } from "discord.js";
import { Mokkun } from "../../mokkun";
import { SafeEmbed } from "../embed/SafeEmbed";
import { SilentError, LoggedError } from "../errors/errors";
import { ICommand } from "./ICommand";

export default class Context {
    readonly int?: CommandInteraction & { channel: TextChannel | DMChannel }
    readonly msg?: Message & { channel: TextChannel | DMChannel }
    readonly options = new Collection<string | number, any>();
    readonly args: any[] = [];
    readonly isSlash: boolean;
    readonly channel: TextChannel | DMChannel;
    readonly user: User;
    readonly member?: GuildMember;
    readonly guild?: Guild;

    private _reply: Message;
    private _deferred = false;

    get replied() {
        return this.isSlash ? this.int.replied : !!this._reply;
    }

    constructor(intormsg: CommandInteraction | Message, readonly command: ICommand, readonly bot: Mokkun, readonly prefix?: string) {
        if(intormsg instanceof CommandInteraction && (intormsg.channel instanceof TextChannel || intormsg.channel instanceof DMChannel)) {
            this.int = intormsg as any;
            this.isSlash = true;
            this.channel = this.int.channel;
            this.user = this.int.user;
            this.member = this.int.member as GuildMember;
            this.guild = this.int.guild;
            this.parseSlashArgs(this.int.options);
        } else if((intormsg.channel instanceof TextChannel || intormsg.channel instanceof DMChannel)) {
            this.msg = intormsg as any;
            this.isSlash = false;
            this.channel = this.msg.channel;
            this.user = this.msg.author;
            this.member = this.msg.member;
            this.guild = this.msg.guild;
            this.parseRegularArgs(this.msg.content);
        } else
            throw Error('Invalid argument types supplied or command executed not in TextChannel nor DMChannel');
    }

    private parseRegularArgs(args: string) {
        let scope = this.bot.commands.get(args.slice(this.prefix.length).split(' ').shift().trim());
        let tempargs = Context.getArgs(args, { scope, prefix: this.prefix, ...this.command.argOpts });
        
        if(this.command.options) {
            this.command.options.forEach((option, i) => {
                let notset = false;
                const err = () => {
                    if(option.required) 
                        throw Error(`Expected ${option.type} at position ${i}`);
                    tempargs.shift();
                    notset = true;
                }

                if(option.type == 'STRING') {
                    if(!tempargs[0]?.length)
                        err();
                    else if(!('choices' in option) || (option.choices.length && option.choices.map(c => c.value).includes(tempargs[0])))
                        this.args.push(tempargs.shift());
                    else if('choices' in option)
                        throw Error(`Expected ${option.type} at position ${i} to be one of: \`${option.choices.map(c => c.value).join(', ')}\`, instead got ${tempargs[0]}`);
                }
                else if(option.type == 'INTEGER') {
                    type N = ApplicationCommandNumericOption;
                    if(Number.isInteger(+tempargs[0])) {
                        if('choices' in option && option.choices?.length && !option.choices.map(c => c.value).includes(tempargs[0]))
                            throw Error(`Expected ${option.type} at position ${i} to be one of: \`${option.choices.map(c => c.value).join(', ')}\`, instead got ${tempargs[0]}`);
                        if(+tempargs[0] >= ((option as N).minValue ?? -Infinity) && +tempargs[0] <= ((option as N).maxValue ?? Infinity))
                            this.args.push(+tempargs.shift());
                        else
                           throw Error(`${option.type} at position ${i} must be >= than ${(option as N).minValue} and <= than ${(option as N).maxValue}`);
                    }
                    else
                        err();
                } 
                else if(option.type == 'BOOLEAN') {
                    if(['True', 'true'].includes(tempargs[0])) {
                        tempargs.shift();
                        this.args.push(true);
                    } else if(['False', 'false'].includes(tempargs[0])) {
                        tempargs.shift();
                        this.args.push(false);
                    } else
                        err();
                } 
                else if(option.type == 'USER') {
                    if([...(tempargs[0] || '')?.matchAll(MessageMentions.USERS_PATTERN)][0]?.[1])
                        this.args.push(this.msg.mentions[this.msg.guild ? 'members' : 'users'].get([...tempargs.shift().matchAll(MessageMentions.USERS_PATTERN)][0][1]));
                    else
                        err();
                }
                else if(option.type == 'CHANNEL') {
                    if([...(tempargs[0] || '')?.matchAll(MessageMentions.CHANNELS_PATTERN)][0]?.[1])
                        this.args.push(this.msg.mentions.channels.get([...tempargs.shift().matchAll(MessageMentions.CHANNELS_PATTERN)][0][1]));
                    else
                        err();
                }
                else if(option.type == 'ROLE') {
                    if([...(tempargs[0] || '')?.matchAll(MessageMentions.ROLES_PATTERN)][0]?.[1])
                        this.args.push(this.msg.mentions.roles.get([...tempargs.shift().matchAll(MessageMentions.ROLES_PATTERN)][0][1]));
                    else
                        err();
                }
                else if(option.type == 'MENTIONABLE') {
                    if([...(tempargs[0] || '')?.matchAll(MessageMentions.ROLES_PATTERN)][0]?.[1])
                        this.args.push(this.msg.mentions.roles.get([...tempargs.shift().matchAll(MessageMentions.ROLES_PATTERN)][0][1]));
                    else if([...(tempargs[0] || '')?.matchAll(MessageMentions.USERS_PATTERN)][0]?.[1])
                        this.args.push(this.msg.mentions[this.msg.guild ? 'members' : 'users'].get([...tempargs.shift().matchAll(MessageMentions.USERS_PATTERN)][0][1]));
                    else
                        err();
                }
                else if(option.type == 'NUMBER') {
                    type N = ApplicationCommandNumericOption;
                    if(!isNaN(+tempargs[0])) {
                        if('choices' in option && option.choices?.length && !option.choices.map(c => c.value).includes(tempargs[0]))
                            throw Error(`Expected ${option.type} at position ${i} to be one of: \`${option.choices.map(c => c.value).join(', ')}\`, instead got ${tempargs[0]}`);
                        if(+tempargs[0] >= ((option as N).minValue ?? -Infinity) && +tempargs[0] <= ((option as N).maxValue ?? Infinity))
                            this.args.push(+tempargs.shift());
                        else
                           throw Error(`${option.type} at position ${i} must be >= than ${(option as N).minValue ?? -Infinity} and <= than ${(option as N).maxValue ?? Infinity}`);
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

    private parseSlashArgs(args: CommandInteraction['options']) {
        for(let option of this.command.options || []) {
            let resOpt = args.get(option.name);
            if(typeof resOpt == 'undefined' || typeof resOpt == 'object' && !resOpt)
                continue;
            this.args.push(resOpt?.member || resOpt?.user || resOpt?.channel || resOpt?.role || resOpt?.value);
            this.options.set(option.name, resOpt?.member || resOpt?.user || resOpt?.channel || resOpt?.role || resOpt?.value);
        }
    }

    async deferReply(opts: InteractionDeferReplyOptions & { fetchReply: true }): Promise<Message>;
    async deferReply(opts?: InteractionDeferReplyOptions): Promise<void>;
    async deferReply(opts?: Parameters<CommandInteraction['deferReply']>[0]) {
        if(this.isSlash)
            return await this.int.deferReply(opts);
        
        if(!this._reply) {
            this._deferred = true;
            this._reply = await this.msg.reply({ allowedMentions: { repliedUser: false }, content: `${this.bot.user.username} is thinking...`});
        }
        else
            throw Error('The reply to this message has already been sent or deferred.');

        if(opts?.fetchReply)
            return this._reply;
    }

    async deleteReply() {
        if(this.isSlash)
            return await this.int.deleteReply();
        if(this._reply)
            await this._reply.delete();
        else
            throw Error('The reply to this message has not been sent or deferred. (deleteReply)');
    }

    async editReply(opts: Parameters<CommandInteraction['editReply']>[0]): Promise<Message> {
        if(this.isSlash)
            return await this.int.editReply(opts) as Message;
        if(this._reply) {
            if(this._deferred && !(opts as any).content)
                (opts as any).content = null;
            this._deferred = false;
            return await this._reply.edit({ ...(typeof opts == 'string' ? { content: opts } : opts), allowedMentions: { repliedUser: false } });
        }
        else
            throw Error('The reply to this message has not been sent or deferred. (editReply)');
    }

    async fetchReply() {
        if(this.isSlash)
            return await this.int.fetchReply();
        if(this._reply)
            return this._reply;
        else
            throw Error('The reply to this message has not been sent or deferred. (fetchReply)')
    }

    async followUp(opts: Parameters<CommandInteraction['followUp']>[0]): Promise<Message> {
        if(this.isSlash)
            return await this.int.followUp(opts) as Message;
        
        if(this._deferred) {
            this._deferred = false;
            this._reply.edit({ ...(typeof opts == 'string' ? { content: opts } : opts), allowedMentions: { repliedUser: false } });
        } 
        else if(this._reply)
            this._reply.reply({ ...(typeof opts == 'string' ? { content: opts } : opts), allowedMentions: { repliedUser: false } });
        else
            throw Error('The reply to this message has not been sent or deferred. (followUp)')
    }

    async reply(opts: InteractionReplyOptions & { fetchReply: true }): Promise<Message>;
    async reply(opts: string | MessagePayload | InteractionReplyOptions): Promise<void>;
    async reply(opts: string | MessagePayload | InteractionReplyOptions) {
        if(this.isSlash)
            return await this.int.reply(opts);

        if(!this._reply)
            this._reply = await this.msg.reply({ ...(typeof opts == 'string' ? { content: opts } : opts), allowedMentions: { repliedUser: false } });
        else 
            throw Error('The reply to this message has already been sent or deferred.');
        
        if(typeof opts != 'string' && 'fetchReply' in opts && opts.fetchReply)
            return this._reply;
    }

    emb(ctn: string, opts?: { in?: 'DESC'|'AUTHOR'|'TITLE', color?: ColorResolvable }) {
        return new SafeEmbed().setColor(opts?.color ?? this.bot.sysColor).setAuthor((opts?.in == 'AUTHOR' || !opts?.in) ? ctn : '').setDescription(opts?.in == 'DESC' ? ctn : '').setTitle(opts?.in == 'TITLE' ? ctn : '');
    }

    async handleError(err: any) {
        if(err instanceof SilentError || err instanceof LoggedError)
            return;
        if(process.env.DEBUG)
            console.log(err);
        const msg = { embeds: [this.bot.emb(`**Napotkano na błąd podczas wykonywania tej komendy :(**\n${err}`)] };
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

    static getArgs(ctn: string, opts: ICommand['argOpts'] & { prefix?: string, scope?: ICommand }) {
        let content: string | string[] = ctn.slice(opts?.prefix?.length || 0);
        let args = [];
        if(opts?.splitter) 
            content = content.split(opts?.splitter);
        args.push(...((opts?.splitter ? content[0] : content) as string).split(" ").map(v => v.trim()).filter(v => v != " " && v != ""));
        if(opts?.scope) {
            args.shift();
            for(let a of args)
                if(opts.scope.subcommands?.has(a)) {
                    args.shift();
                    opts.scope = opts.scope.subcommands.get(a);
                }
                else break;
        }
        if(typeof opts?.free == 'number')
            args = [...args.slice(0, opts.free), args.slice(opts.free).join(" ")];
        if(opts?.splitter)
            args.push(...(content as string[]).slice(1).map(v => v.trim()));
        
        return args;
    }
}