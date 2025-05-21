const fs = require("fs");
const path = require('path');
const rp = require("request-promise");

module.exports = {
    name: 'spoiler',
    description: 'wysyła piki jako spoiler',
    usage: '`$pspoiler` - w załączniku dołącz plik (max. 8MB)',
    async execute(msg, args, bot)
    {
        let attch = msg.attachments.array();

        if(attch[0] && attch[0].filesize > 8000000) msg.channel.send(bot.embgen(bot.sysColor, "Załącznik max. 8MB"));
        if(!attch[0] || attch[0].filesize > 8000000) return;
        
        let fname = `SPOILER_${attch[0].url.slice(attch[0].url.lastIndexOf("/") + 1)}`;
        let fpath = path.join(__dirname, "..", "files", "temp", fname);
        let fplace = fs.createWriteStream(fpath);

        msg.delete({timeout: 150});

        rp(attch[0].url).on('data', data => fplace.write(data)).on("complete", () => fplace.close());
        fplace.on("close", async () => {
            await msg.channel.send({files: [fpath]});
            fs.unlinkSync(fpath);
        });
    }
}