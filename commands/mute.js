const fs = require('fs');
const config = require('../config.json');
const { embgen } = require('../setup');

module.exports = {
    name: 'mute',
    description: '',
    usage: '',
    async execute(msg, args) {
        const color = '#FFFFFF';
        let eventL;

        bot.on("message", eventL = async nmsg => {
            if(nmsg.channel.id != msg.channel.id) return;
            if(nmsg.content == config.prefix + 'mute') {
                bot.removeListener("message", eventL);
                return;
            }
            nmsg.delete(100);
        });
    }
}