import { Mokkun } from "../mokkun";
import { IExtMessage } from "./interfaces/DiscordExtended";
import { PermissionString } from "discord.js";

export namespace CmdParams {
    export type m = IExtMessage;
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
}

export function aliases(...aliases: string[]) {
    return function(target: any, propertyKey: any, propDesc: PropertyDescriptor) {
        let props = initProps(target, propertyKey);
        if(!props.aliases)
            props.aliases = [];
        props.aliases.push(...aliases);
    }
}

export function register(description: string = '', usage: string = '') {
    return function(target: any, propKey: string, propDesc: PropertyDescriptor) {
        initProps(target, propKey);
        target["_" + propKey] = Object.assign({}, target["_" + propKey], {
            name: propKey,
            description: description,
            usage: usage,
            execute: propDesc.value
        });
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

export function permissions(...permArr: PermissionString[]) {
    return function(target: any, propKey?: string) {
        if(!propKey) applyToAll(target, 'permissions', permArr);
        else initProps(target, propKey).permissions = permArr;
    }
}

export function group(group: string) {
    return function(target: any, propKey?: string) {
        if(!propKey) applyToAll(target, 'group', group);
        else initProps(target, propKey).group = group;
    }
}

export function nsfw(target: any, propKey?: string) {
    if(!propKey) applyToAll(target, 'nsfw', true);
    else initProps(target, propKey).nsfw = true;
}

export function extend(transFn: any) {
    return function modify(target: any) {
        if(!transFn) throw Error("Modyfying method not found");
        for(let fn in target) {
            if(!fn.startsWith("_")) continue;
            let temp = target[fn].execute;
            target[fn].execute = async function(msg: any, args: any, bot: any) {
                await temp(...transFn(msg, args, bot));
            }
        }
    }
}