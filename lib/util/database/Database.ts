import path from "path";
import fs from 'fs';
import { IDatabase } from "./IDatabaseData.js";
import { BaseClient } from "discord.js";

export class Database extends BaseClient {
    private dbPath: string;
    readonly DBinstance: IDatabase;
    private static pubInst: Database;

    get absoluteDbPath() {
        return path.join(process.cwd(), this.dbPath);
    }

    private constructor(dbPath: string) {
        super();
        this.dbPath = dbPath;
        this.DBinstance = this.prepareDb();
        this.addInstanceGetSave();
    }

    static getInstance(dbPath: string) {
        if(!this.pubInst)
            this.pubInst = new Database(dbPath);
        return this.pubInst;
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
        this.DBinstance.get = (query) => {
            let qy = query.split(".");
            let temp = this.DBinstance[qy.shift()!];
            for(let q of qy)
                if(temp === undefined) 
                    break;
                else   
                    temp = temp[q];
            return temp;
        };

        this.DBinstance.save = (query, data) => {
            let qy = query.split(".");
            let temp = this.DBinstance;
            for(let q of qy.slice(0, -1)) {
                if(temp[q] === undefined) 
                    temp[q] = {};
                temp = temp[q]
            }
            temp[qy.slice(-1)[0]] = data;
            this.save();
        }
    }

    private save() {
        fs.writeFileSync(this.absoluteDbPath, JSON.stringify(this.DBinstance, null, 2));
    }
}