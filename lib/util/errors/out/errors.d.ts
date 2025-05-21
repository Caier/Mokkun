import { TextChannel } from 'discord.js';
export declare class LoggedError extends Error {
    channel?: TextChannel;
    constructor(channel?: TextChannel, message?: string);
}
//# sourceMappingURL=errors.d.ts.map