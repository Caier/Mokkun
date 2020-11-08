import path from "path";
import fs from 'fs';
import { IDatabase } from "./IDatabaseData";
import { BaseClient } from "discord.js";

export class Database extends BaseClient {
    private readonly dbWatchInterval = 5000;
    private dbPath: string;
    readonly instance: IDatabase;

    get absoluteDbPath() {
        return path.join(process.cwd(), this.dbPath);
    }

    constructor(dbPath?: string) {
        super();
        this.dbPath = dbPath;
        this.instance = this.prepareDb();
        this.watchDbForChanges();
        this.addInstanceGetSave();

    }

    private prepareDb(): IDatabase {
        if(!this.dbPath) this.dbPath = `files/temp/${new Date().toISOString().replace(/[^A-z0-9]/g, "")}.db`;
        let db = JSON.parse(fs.existsSync(this.absoluteDbPath) && fs.readFileSync(this.absoluteDbPath).toString() || "{}");
        if(Object.entries(db).length == 0) {
            console.log("Starting with an empty database!");
            fs.writeFileSync(this.absoluteDbPath, "{}");
        }
        return db;
    }

    private addInstanceGetSave() {
        this.instance.get = (query) => {
            let qy = query.split(".");
            let temp = this.instance[qy.shift()];
            for(let q of qy)
                if(temp === undefined) 
                    break;
                else   
                    temp = temp[q];
            return temp;
        };

        this.instance.save = (query, data) => {
            let qy = query.split(".");
            let temp = this.instance;
            for(let q of qy.slice(0, -1)) {
                if(temp[q] === undefined) 
                    temp[q] = {};
                temp = temp[q]
            }
            temp[qy.slice(-1)[0]] = data;
            this.save();
        }
    }

    private watchDbForChanges() {
        let previousState = JSON.stringify(this.instance);

        this.setInterval(() => {
            if(JSON.stringify(this.instance) != previousState) {
                previousState = JSON.stringify(this.instance);
                this.save();
            }
        }, this.dbWatchInterval);
    }

    private save() {
        fs.writeFileSync(this.absoluteDbPath, JSON.stringify(this.instance, null, 2));
    }
}