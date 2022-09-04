import Discord, { Partials } from 'discord.js';
import fs from 'fs-extra';
import path from 'path';
import { MokkunMusic } from './util/music/MokkunMusic.js';
import { Database } from './util/database/Database.js';
import { IDatabase } from './util/database/IDatabaseData.js';
import BaseEventHandler from './events/BaseEventHandler.js';
import Task from './util/tasks/Task.js';
import { GatewayIntentBits } from 'discord-api-types/v10';
import CommandManager from './util/commands/CommandManager.js';
import ProviderResolver from './util/transit/ProviderResolver.js';

export class Mokkun extends Discord.Client {
    private static reqVars = ["TOKEN", "BOT_OWNER", "DB_PATH"];
    private static reqDirs = [path.join(process.cwd(), 'files', 'temp'),
                              path.join(process.cwd(), 'files', 'global')];
    static sysColor = 0xFFFFFE;

    //music = new MokkunMusic(this);
    commands = new CommandManager(this);
    vars: { [key: string]: any };
    db: IDatabase;

    constructor(vars?: Mokkun['vars']) {
        super({ intents: Object.values(GatewayIntentBits) as number[], partials: [Partials.Channel] }); //politely fuck off
        this.vars = Object.assign({}, process.env, vars);
        this.ensureVars();
        this.ensureDirs();
        this.db = Database.getInstance(this.vars.DB_PATH).DBinstance;
        this.start();
    }

    private ensureVars() {
        let missVars = Mokkun.reqVars.filter(v => !this.vars[v]);
        if(missVars.length != 0)
            throw Error("Missing some requred variables: " + missVars.join(", "));
    }

    private ensureDirs() {
        for(let dir of Mokkun.reqDirs)
            fs.ensureDirSync(dir);
    }

    private async start() {
        await BaseEventHandler.loadEvents(this);
        await ProviderResolver.loadResolvers();

        await super.login(this.vars.TOKEN);
        this.on("error", err => console.error("Websocket error: ", err));
        this.on("shardReconnecting", () => console.log("Reconnecting to Discord..."));

        await this.commands.start();
        await import('./tasks.js');
        Task.attach(this);
    }
}