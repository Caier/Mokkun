module.exports = {
    name: 'help',
    description: 'pomoc',
    usage: 'help {nazwa komendy}',
    execute(msg, args)
    {
        data = [];

      if(args.length < 2){
        data.push('Lista komend:');
        data.push(commands.map(command => command.name).join(", "));
        data.push('\nWpisz `help {nazwa komendy}` aby uzyskać pomoc co do specyficznej komendy!');

        msg.channel.send(data);
        }
        else {
            const command = commands.get(args[1]);

            if(!command)
                msg.channel.send("To nie jest prawidłowa komenda...");

            data.push(`**Nazwa:** ${command.name}`);

            if(command.description) data.push(`**Opis:** ${command.description}`);
            if(command.usage) data.push(`**Używanie:** ${command.usage}`);

            msg.channel.send(data);
        }
    }
}