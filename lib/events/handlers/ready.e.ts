import BaseEventHandler, { Event } from "../BaseEventHandler";

@Event('ready')
export default class extends BaseEventHandler {
    onceevent() {
        console.log(`(re)Logged in as ${this.bot.user.tag}`);
        if(this.bot.db.System.presence) {
            this.bot.user.setActivity(this.bot.db.System.presence.name, {type: this.bot.db.System.presence.type.toUpperCase()});
        }
    }
}