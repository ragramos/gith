const botSettings = require("./githsettings.json");
const discord = require("discord.js");
const fs = require("fs");
const mySql = require("mysql");

const bot = new discord.Client({disableEveryone: true});

bot.commands = new discord.Collection();
bot.color = botSettings.color;

fs.readdir("./cmd", (err, files) => {
    if(err) console.error(err);

    let jsFiles = files.filter(f => f.split(".").pop() === "js");
    if(jsFiles.length <= 0) {
        console.log("No commands to load.");
        return;
    }

    console.log(`Loading ${jsFiles.length} commands.`);

    jsFiles.forEach((f, i) => {
        let props = require(`./cmd/${f}`);
        console.log(`${i+1}: ${f} loaded.`);
        bot.commands.set(props.help.name, props);
    });
});

var conn = mySql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.db
});

conn.connect(err => {
    if(err) throw err;
    console.log(`Connected to database ${conn.config.database}.`);
});

bot.on("ready", async () => {
    bot.user.setPresence({ game: { name: `D&D 5e.`}, type: 0});
    console.log(`${bot.user.username} is ready!`);
    console.log(bot.commands);
});

bot.on("message", async message => {
    if(message.author.bot) return;
    if(message.channel.type === "dm") return;

    let args = message.content.split(" ");
    let command = args[0];
    args = args.slice(1);
        
    if(!command.startsWith(botSettings.prefix)) return;

    let cmd = bot.commands.get(command.slice(botSettings.prefix.length));
    if(cmd) cmd.run(bot, message, args, conn);

});

bot.login(process.env.token);