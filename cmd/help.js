const discord = require("discord.js");
const mySql = require("mysql");

module.exports.run = async (bot, message, args, conn) => {
    console.log("Gith - Help invoked.")

    // no args, list commands
    if(!args[0]) {
        let helpStr = "";
        bot.commands.forEach(c => {
            if(helpStr.length == 0) {
                helpStr = "~" + c.help.name;
            } else {
                helpStr = helpStr + "\n" + "~" + c.help.name;
            }
        });
        let helpEmbed = new discord.RichEmbed()
            .setColor(bot.color)
            .setTitle("Available Gith Commands")
            .setDescription(helpStr)
            .setFooter("Type ~help [COMMAND] for more info.");
            message.channel.send({embed: helpEmbed});
    // something passed, check to see if it's a valid command
    } else {
        bot.commands.forEach(c => {
            if(args[0] == c.help.name) {
                let cmdEmbed = new discord.RichEmbed()
                .setColor(bot.color)
                .setTitle(`~${c.help.name}`)
                .setDescription(`Use as shown below. Items in [brackets] are optional.\n\n~${c.help.usage}`);
                message.channel.send({embed: cmdEmbed});
            }
        });
    }
}

module.exports.help = {
    name: "help",
    usage: "help [COMMAND]"
}