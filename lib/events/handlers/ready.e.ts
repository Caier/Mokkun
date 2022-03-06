import BaseEventHandler, { Event } from "../BaseEventHandler";

@Event('ready')
export default class extends BaseEventHandler {
    onceevent() {
        console.log(`(re)Logged in as ${this.bot.user.tag}`);
        const presence = this.bot.db.System.presence;
        if(presence)
            this.bot.user.setPresence({ status: presence.status ?? 'online', activities: [{ name: presence.activity?.name ?? '', type: presence.activity?.type ?? '' }] });
    }
}