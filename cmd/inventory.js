const discord = require("discord.js");
const mySql = require("mysql");

module.exports.run = async (bot, message, args, conn) => {
    console.log("Gith - Inventory invoked by " + message.guild.member(message.author).displayName + ".");

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
        let items = await getInv(target.id, conn);

        // no parameters were passed, display character's inventory
        if(!stack[0]) {
            let invStr = "";
            items.forEach(i => {
                if(invStr.length == 0) {
                    invStr = titleCase(i.item_name) + " (" + i.item_qty + ")";
                } else {
                    invStr = invStr + ", " + titleCase(i.item_name) + " (" + i.item_qty + ")";
                }
            });
            if(invStr.length > 0) invStr = invStr + ".";
            let invEmbed = new discord.RichEmbed()
                .setColor(bot.color)
                .setTitle(`Items in inventory for ${message.guild.member(target).displayName}:`)
                .setDescription(invStr);
            message.channel.send({embed: invEmbed});
        // items were passed check for qty
        } else {
            let itemName = "";
            stack.forEach(s => {
                s = s.trim();
                let pair = s.split(" ");
                let strQty = pair.pop();
                let itemQty = parseInt(strQty);
                let itemName = pair.join(" ");
                // if only a number was passed, treat it as the item name
                if(!itemName) {
                    pair.push(strQty);
                    itemName = pair.join(" ");
                    itemQty = null;
                }
                // not a number, put it back, display balance of item
                if(!itemQty) {
                    itemQty = matchItem(items, itemName);
                    if(itemQty == null) {
                        message.channel.send(`${titleCase(itemName)} not found in ${message.guild.members.get(target.id).displayName}'s inventory.`);
                    } else {
                        let itemEmbed = new discord.RichEmbed()
                            .setColor(bot.color)
                            .addField("Item", titleCase(itemName), true)
                            .addField("Qty", itemQty, true);
                        message.channel.send({embed: itemEmbed});
                    }
                // valid pair, adjust or insert
                } else {
                    currentQty = matchItem(items, itemName);
                    // record exists, update
                    if(currentQty != null) {
                        let newQty = currentQty + itemQty;
                        if(newQty > 0) {
                            conn.query(`UPDATE inventory_master SET item_qty = ${newQty} where discord_id = "${target.id}" AND item_name = "${itemName}"`);
                            return message.channel.send(`Successfully updated ${titleCase(itemName)} quantity to ${newQty}.`);
                        } else if(newQty == 0) {
                            conn.query(`DELETE FROM inventory_master where discord_id = "${target.id}" AND item_name = "${itemName}"`);
                            return message.channel.send(`Successfully removed ${titleCase(itemName)} from ${message.guild.member(target).displayName}'s inventory.`);
                        } else {
                            return message.channel.send(`There is not enough ${titleCase(itemName)} in inventory for this transaction.`);
                        }
                    // null qty, insert
                    } else {
                        if(itemQty >= 0) {
                            conn.query(`INSERT INTO inventory_master (discord_id, item_name, item_qty) VALUES ("${target.id}", "${itemName}", ${itemQty})`);
                            return message.channel.send(`Successfully added ${itemQty} ${titleCase(itemName)} to ${message.guild.member(target).displayName}.`);
                        } else {
                            return message.channel.send(`Cannot consume an item not in inventory.`);
                        }
                    }
                }
            });
        }
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

// set string to title case
function titleCase(str) {
    return str.toLowerCase().split(' ').map(function(word) {
      return word.replace(word[0], word[0].toUpperCase());
    }).join(' ');
  }

// read inventory for a character
function getInv(myUser, myConn) {
    return new Promise((resolve, reject) => {
        myConn.query(`SELECT * FROM inventory_master WHERE discord_id = "${myUser}" ORDER BY item_name`, (myErr, myRows) => {
            if(myErr) reject(myErr);
            else resolve(myRows);
        });
    });
}

// find item in the array
function matchItem(myList, myItem) {
    let foundItem = false;
    let myQty = 0;
    myList.forEach(l => {
        if(l.item_name == myItem) {
            foundItem = true;
            myQty = l.item_qty;
        }
    });
    if(foundItem) return myQty;
    else return null;    
}

module.exports.help = {
    name: "inv",
    usage: "inv [@MENTION] [ITEM_NAME QTY / ITEM_NAME QTY ...]"
}
