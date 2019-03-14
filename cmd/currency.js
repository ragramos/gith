const discord = require("discord.js");
const mySql = require("mysql");

module.exports.run = async (bot, message, args, conn) => {
    console.log("Gith - Currency invoked by " + message.guild.members.get(message.author.id).displayName + ".");

    // check for metion and remove it from args if it's there
    let target = message.mentions.users.first();
    if(!target) {
        target = message.member;
    } else {
        args = args.slice(1);
    }
    
    // own character or have permission
    if(target.id === message.author.id || message.member.roles.some(role => role.name === 'Moderator')) {
        // parse arguments to determine what field we're inserting/updating
        let parm = args.join(" ");
        let stack = scrub(parm.split("/"));
        
        // load invetory for this character
        let funds = await getCurr(target.id, conn);
        let newFunds = {"discord_id": "", "pp": 0, "gp": 0, "sp": 0, "cp": 0};

        if(funds) newFunds = funds;

        // at least 1 coin name was passed
        if(stack[0]) {
            let coins = ["pp", "gp", "sp", "cp"];

            stack.forEach(s => {
                s = s.trim();
                let pair = s.split(" ");
                let coinName = pair[0];
                let foundCoin = false;
                // loop through valid coin names
                for(i = 0; i < coins.length; i++) {
                    if(coinName == coins[i]) {
                        foundCoin = true;
                    }
                }
                
                // valid coin name
                if (foundCoin) {
                    let coinQty = parseInt(pair.pop());
                                        
                    // valid quantity
                    if(coinQty) {
                        let newQty = newFunds[coinName] + coinQty;

                        // positive balance
                        if(newQty >= 0) {
                            newFunds[coinName] = newQty;

                        // negative balance, not enough funds
                        } else {
                            return message.channel.send("There is not enough currency of type " + coinName + " for this transaction.");
                        }
                    }

                // bogus coin name
                } else {
                    return message.channel.send("No currency named " + coinName + ".");
                }
            });
            // all commands processed, insert or update
            if(!funds) {
                conn.query(`INSERT INTO currency_master (discord_id, pp, gp, sp, cp) VALUES ('${target.id}', ${newFunds["pp"]}, ${newFunds["gp"]}, ${newFunds["sp"]}, ${newFunds["cp"]})`);
            } else {
                conn.query(`UPDATE currency_master SET pp = ${newFunds["pp"]}, gp = ${newFunds["gp"]}, sp = ${newFunds["sp"]}, cp = ${newFunds["cp"]} where discord_id = '${target.id}'`);
            }
        }

        // all inquiries and updates done, display a single result
        let fundsEmbed = new discord.RichEmbed()
            .setColor(bot.color)
            .setTitle(`Currency carried by ${message.guild.members.get(target.id).displayName}:`)
            .setDescription("`PP: " + newFunds["pp"] + " | GP: " + newFunds["gp"] + " | SP: " + newFunds["sp"] + " | CP: " + newFunds["cp"] + "`");
        message.channel.send(fundsEmbed);

    // no permission        
    } else {
        return message.channel.send("You don't have permission to access this character.");
    }
}
    
// strip each array element of junk and lowercase it (i.e. special characters except for ' and -) [^A-z\'\-]
function scrub(arr) {
    for(i = 0; i < arr.length; i++) arr[i] = arr[i].replace(/[^A-z0-9 \'\-]/gi, "").toLowerCase();
    return arr;
}
    
// read currency for a character
function getCurr(myUser, myConn) {
    return new Promise((resolve, reject) => {
        myConn.query(`SELECT * FROM currency_master WHERE discord_id = '${myUser}'`, (myErr, myRows) => {
            if(myErr) reject(myErr);
            else resolve(myRows[0]);
        });
    });
}
    
module.exports.help = {
    name: "curr",
    usage: "curr [@MENTION] [pp QTY / gp QTY / sp QTY / cp QTY]"
}
