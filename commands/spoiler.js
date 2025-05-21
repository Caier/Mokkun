const dl =    require("download-file");
const fs =    require("fs");
const config = require("../config.json");
const vars = config.settings.variables;

module.exports = {
    name: 'spoiler',
    description: 'wysyła piki jako spoiler',
    usage: '`spoiler` - w załączniku dołącz plik (max. 8MB)',
    execute(msg)
    {
        attch = msg.attachments.array();
        
        if(attch[0] && attch[0].filesize < 8000000)
        {
            fname = `SPOILER_${attch[0].url.slice(attch[0].url.lastIndexOf("/") + 1)}`;
            msg.delete(100).catch(uwu => {});
            
            dl(attch[0].url, {directory: `./filesystem/temp`, filename: fname}, err => {
                if(err) {
                    msg.channel.send(err.message);
                    return;
                }
                msg.channel.send("", {file: `./filesystem/temp/${fname}`}).catch(err => {
                    msg.channel.send(err.message);
                    return;
                }).then(e => {
                    try {fs.unlinkSync(`./filesystem/temp/${fname}`);}
                    catch (err) {msg.channel.send(err.message); return;}
                });
            });
        }
        else if(attch[0]) msg.channel.send("Załącznik max. 8MB");
    }
}