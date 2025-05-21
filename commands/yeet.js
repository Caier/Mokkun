module.exports = {
    name: 'yeet',
    description: 'b e z p i e c z n i e  usuwa wiadomości',
    usage: '`$pyeet {liczba wiadomości do skasowania} (opcjonalnie){czyje wiadomości}`',
    notdm: true,
    async execute(msg, args, bot)
    {
        let glassji;
        const color = '#93c0ff';
        try {
            glassji = bot.guilds.resolve('427235931796537374').emojis.find(e => e.name == 'looking');
        }
        catch(e) {
            console.log("ERR: yeet.js, nie można połączyć się z serwerem technicznym");
            glassji = "tech_serv_err";
        }
        let max = (msg.member.permissions.has('MANAGE_MESSAGES')) ? 100 : 20;

        if(!/^[0-9]+$/.test(args[1])) return;
       
        if(parseInt(args[1]) > max) {
            msg.channel.send(bot.embgen(color, `Możesz maksymalnie usunąć ${max} wiadomości`));
            return;
        }
        
        let smsg;
        await msg.channel.send(bot.embgen(color, `Wyszukiwanie wiadomości... ${glassji}`)).then(nmsgg => smsg = nmsgg);
        let msgss = await bot.fetchMsgs(msg, parseInt(args[1]), (msg.mentions.members.first()) ? msg.mentions.members.first().id : false, msg.id);
        smsg.delete({timeout: 150});

        if(msgss.size == 0) {
            let nmsg;
            msg.channel.send(bot.embgen(color, "Nie znaleziono żadnych wiadomości!")).then(nmsgg => nmsg = nmsgg);
            await setTimeout(() => {nmsg.delete({timeout: 150}); msg.delete({timeout: 150});}, 4000);
            return;
        }

        msg.channel.send(bot.embgen(color, `Czy chcesz usunąć **${msgss.size}** wiadomości${(msg.mentions.members.first() != undefined) ? ` od użytkownika **${msg.mentions.members.first().user.tag}**` : ``}?\nZareaguj aby potwierdzić`)).then(async msgg => 
        {
            let eventL;
            setTimeout(() => bot.removeListener("messageReactionAdd", eventL), 600000);
            await msgg.react('👍');
            await msgg.react('👎');

            bot.on("messageReactionAdd", eventL = async (rect, user) => 
            {
                if(user.id != msg.author.id || rect.message.id != msgg.id) return;
                
                if(rect.emoji.toString() == '👍')
                {
                    msg.delete({timeout: 150});
                    msgg.delete({timeout: 150});
                    msg.channel.bulkDelete(msgss).catch(async () => {
                        let nmsg;
                        await msg.channel.send(bot.embgen(color,"Wiadomości starsze niż 2 tygodnie lub więcej niż 100...\nUsuwanie pojedyncze...\n\nPodczas procesu bot może nieobsługiwać nowych prośb o usunięcie wiadomości!\n\nPo zakończeniu ta wiadomość powinna zostać usunięta...")).then(nmsgg => nmsg = nmsgg);
                        let job = msgss.deleteAll();
                        job[job.length - 1].then(() => nmsg.delete({timeout: 150}));
                    });
                }
                else 
                {
                    await msgg.edit(bot.embgen(color, "Wiadomości nie zostaną usunięte"));
                    setTimeout(() => {msg.delete({timeout: 150}); msgg.delete({timeout: 150});}, 4000);
                }

                bot.removeListener("messageReactionAdd", eventL);
            });
        });
    }
}