const rq = require('request');

module.exports = {
    name: 'shorten',
    description: 'skraca linki za pomocą bitly.com',
    usage: '`$pshorten {link do skrócenia}`',
    execute(msg, args, bot)
    {
        if(!args[1]) return;

        let color = '#fade00';

        rq.post("https://bitly.com/data/shorten", {headers: {cookie: '_xsrf=0;', 'x-xsrftoken': 0}}, (err, res, body) => {
            if(err) {msg.channel.send(bot.embgen(color, err)); return}
            if(res.statusCode != 200) {msg.channel.send(bot.embgen(color, `Status code: ${res.statusCode}`)); return}
            body = JSON.parse(body);
            if(body.status_code == 200)
                msg.channel.send(new bot.RichEmbed().setColor(color).setTitle(body.data.anon_shorten.link).setDescription(args[1]));
            else 
                msg.channel.send(bot.embgen(color, `ERR: ${body.status_txt}`));
        }).form({url: encodeURI(args[1])});
    }
}