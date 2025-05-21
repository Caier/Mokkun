const fs = require('fs');
const config = require('../config.json');
const { embgen } = require('../setup');

module.exports = {
    name: 'lockcom',
    description: '',
    usage: '',
    ownerOnly: true,
    async execute(msg, args) {
        const color = '#FFFFFF';
        const lockfile = config.settings.variables.lockcom;

        if(!commands.has(args[2]) || args[2] == this.name) return;

        if(args[1] == 'global')
        {
            let filter = (fs.existsSync(lockfile)) ? JSON.parse(fs.readFileSync(lockfile)) : [];
            if(!filter.includes(args[2])) {
                filter.push(args[2]);
                fs.writeFileSync(lockfile, JSON.stringify(filter));
                msg.channel.send(embgen(color, `Zablokowano komendę ${args[2]}`));
            }
            else {
                fs.writeFileSync(lockfile, JSON.stringify(filter.filter(e => e != args[2])));
                msg.channel.send(embgen(color, `Odblokowano komendę ${args[2]}`));
            }
        }
    }
}