import { Mokkun } from "../../mokkun.js";
import { Collection, Message } from "discord.js";
import { CommandGroup, ICommand } from "./ICommand.js";
import Context from "./Context.js";

export namespace CmdParams {
    export type m = Message;
    export type a = any[];
    export type b = Mokkun;
}

function initProps(target: any, pk: string) {
    if(!target["_" + pk])
        target["_" + pk] = {};
    return target["_" + pk];
}

function applyToAll(target: any, what: string, val: any) {
    for(let prop in target) {
        if(!prop.startsWith("_")) continue;
        initProps(target, prop.slice(1))[what] = val;
    }
    target[`$${what}`] = val;
}

export function aliases(...aliases: Exclude<ICommand['aliases'], undefined>) {
    return function(target: any, propertyKey?: any) {
        if(!propertyKey) {
            target.$$aliases = aliases;
            return;
        }
        let props = initProps(target, propertyKey);
        if(!props.aliases)
            props.aliases = [];
        props.aliases.push(...aliases);
    }
}

export function register(description: string = '', usage: string = '', opts?: ICommand['argOpts']) {
    return function(target: any, propKey: string, propDesc: PropertyDescriptor) {
        initProps(target, propKey);
        target["_" + propKey] = Object.assign({}, target["_" + propKey], {
            name: propKey,
            description,
            usage,
            argOpts: opts,
            execute: propDesc.value
        });
    }
}

export function options(...opts: Exclude<ICommand['options'], undefined>) {
    return function(target: any, propKey?: string) {
        if(!propKey) applyToAll(target, 'options', opts);
        else initProps(target, propKey).options = opts;
    }
}

export function notdm(target: any, propKey?: string) {
    if(!propKey) applyToAll(target, 'notdm', true);
    else initProps(target, propKey).notdm = true;
}

export function ownerOnly(target: any, propKey?: string) {
    if(!propKey) applyToAll(target, 'ownerOnly', true);
    else initProps(target, propKey).ownerOnly = true;
}

export function permissions(...permArr: Exclude<ICommand['permissions'], undefined>) {
    return function(target: any, propKey?: string) {
        if(!propKey) applyToAll(target, 'permissions', permArr);
        else initProps(target, propKey).permissions = permArr;
    }
}

export function group(group: ICommand['group']) {
    return function(target: any, propKey?: string) {
        if(!propKey) applyToAll(target, 'group', group);
        else initProps(target, propKey).group = group;
    }
}

export function nsfw(target: any, propKey?: string) {
    if(!propKey) applyToAll(target, 'nsfw', true);
    else initProps(target, propKey).nsfw = true;
}

export function autocomplete(autoFn: ICommand['autocomplete']) {
    return function(target: any, propKey?: string) {
        if(!propKey) applyToAll(target, 'autocomplete', autoFn);
        else initProps(target, propKey).autocomplete = autoFn;
    }
}

export function deprecated(target: any, propKey?: string) {
    if(!propKey) applyToAll(target, 'deprecated', true);
    else initProps(target, propKey).deprecated = true;
}

export function extend(transFn: (arg0: Context) => any[]) {
    return function modify(target: any) {
        if(!transFn) throw Error("Modyfying method not found");
        target.$$extend = transFn;
        for(let fn in target) {
            if(!fn.startsWith("_")) continue;
            let temp = target[fn].execute;
            target[fn].execute = async function(ctx: Context) {
                await temp(...(await transFn(ctx)));
            }
        }
    }
}

export function subcommandGroup(desc: string, ...handlers: any[]) {
    return function(target: any) {
        let subcmds = Object.entries(target).filter(e => e[0].startsWith('_')).map(e => e[1]) as ICommand[];
        let scMap = new Collection<string, ICommand>();
        for(let cmd of subcmds) {
            scMap.set(cmd.name, cmd);
            cmd.aliases?.forEach(a => scMap.set(a, cmd));
        }
        handlers[0]['_' + target.name] = <ICommand> {
            name: target.name,
            description: desc,
            subcommandGroup: true,
            subcommands: scMap,
            aliases: target.$$aliases || [],
        }
        for(let k in handlers[0])
            if(k.startsWith('$') && !k.startsWith('$$'))
                handlers[0]['_' + target.name][k.slice(1)] = handlers[0][k];
        for(let i = 1; i < handlers.length; i++)
            subcommandGroup(handlers[i]['_' + handlers[i - 1].name].description, ...handlers.slice(i))(handlers[i - 1]);
    }
}