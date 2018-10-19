
var SlackBot = require("slackbots")
var mysql = require('mysql');

 const envKey = process.env.BOT_TOKEN
 const botAdmin = process.env.BOT_ADMIN_NAME

let con = mysql.createConnection({
   host: process.env.SQL_HOST,
   user: process.env.SQL_USER,
   password: process.env.SQL_PASSWORD,
   database: process.env.SQL_DATABASE
 });

var points = []

// create a bot
var bot = new SlackBot({
  token: envKey,
  name: "++ Bot V2"
})


bot.on('start' , function () {
  sendAdminMessage('Plus Plus Bot V2 Is online')
  con.connect(function(err) {
    if (err) throw err;
   sendAdminMessage('SQL Connected')
  });
})

bot.on('message', function(data) {
  // all ingoing events https://api.slack.com/rtm
  // console.log(data);
  if (data.type === 'message') {
    if (data.text.includes('++')) {
      sendAdminMessage(data);
        if (messageIsDirect(data)) {
          return;
        }

        let alias = data.text.split('+')[0]
        addPointsViaAlias(alias.toLowerCase(), data)
    }else if (data.text.includes('--')) {
      sendAdminMessage(data);
        if (messageIsDirect(data)) {
          return;
        }

        let alias = data.text.split('-')[0]
        removePointsViaAlias(alias.toLowerCase(), data)
    }else if (data.text.includes('??')) {
      if (messageIsDirect(data)) {
        return;
      }

      let alias = data.text.split('?')[0]
      getScoreViaAlias(alias.toLowerCase(), data)
    }else if (data.text.includes('||')) {
      // we only want to listen to direct messages that come from the user
      if (messageIsDirect(data)) {
        return;
      }

      getLeaderBoard(data)
    }else if (data.text.includes('karma')) {
      // we only want to listen to direct messages that come from the user
      if (messageIsDirect(data)) {
        return;
      }

      let alias = data.text.split(' ')[1]
      getScoreViaAlias(alias.toLowerCase(), data)
    }

    if (data.user === botAdmin) {
      if (data.text.includes('addAlias')) {
          let currentAlias = data.text.split('-')[1]
          let newAlias = data.text.split('-')[2]
          addAliasToUserByAlias(newAlias.toLowerCase(),currentAlias.toLowerCase())
      }else if (data.text.includes('findAlias')) {
        let name = data.text.split('-')[1]
        findUserByAlias(name.toLowerCase())
      }else if (data.text === 'allUsers') {
        getAllUsers(bot);
      } else if (data.text === 'configure') {
        configureForAllUsers(bot)
      }
    }
  }
});

function messageIsDirect(msg) {
  if (msg.channel[0] === "D" && msg.bot_id === undefined) {
    return true;
  }
}

function findUserByAlias(string, alias = true) {
    if (alias) {
        let sql = "SELECT * FROM alias WHERE alias = " + con.escape(string) + " LIMIT 1";
        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            if (result[0] !== undefined) {
                findUserById(result[0].userId);
            } else {
                sendAdminMessage("Alias not found: " + string)
            }
        });
    }
}

function findUserById(id) {
    let sql = "SELECT * FROM users WHERE id = " + con.escape(id) + " LIMIT 1";
    con.query(sql, function (err, result, fields) {
        if (err) throw err;
        if (result[0] !== undefined) {
            findUserBySlackId(result[0].userId)
        } else {
            sendAdminMessage("user not found: " + id)
        }
    });
}

function configureForAllUsers() {
    console.log("Configure all users")
    bot.getUsers().then(function (data) {
        let i = 1;

        data.members.forEach(function(item) {
            let sql = "SELECT * FROM users WHERE userId = " + con.escape(item.id) + " LIMIT 1";
            con.query(sql, function (err, result, fields) {
                if (err) throw err;

                if (result[0] !== undefined) {
                    // if user exists do nothing
                    return;
                } else {
                    // If user dosen't exist then create it
                    createUser(item)
                }
            });
        })
    })
}

function createUser(slackUser) {
    if (slackUser.name === 'slackbot') {
        return;
    }

    let sql = "INSERT INTO users (userId, score, name) VALUES (? , 0, ?)"
    con.query(sql, [slackUser.id, slackUser.name] , function (err,result) {
        addAliasToUser(slackUser.name, slackUser.id)
        addAliasToUser(slackUser.full_name, slackUser.id)
    })
}


function findUserBySlackId(id) {
    bot.getUserById(id).then(function (data) {
        sendAdminMessage('User Details: Name:' + data.name)
        sendAdminMessage('Real Name:' + data.profile.real_name)
    })
}

function getAllUsers () {
    bot.getUsers().then(function (data) {
        console.log(data)
        sendAdminMessage('All users are as follow')
        let i = 1;

        data.members.forEach(function(item) {
            sendAdminMessage('#' + i + ';Slack id:' + item.id + ';Slack name:' + item.name + ';Slack real name:' + item.real_name);
            i++
        })
    })
}

function sendAdminMessage(message) {
    bot.postMessage(botAdmin, message)
}

function sendGeneralMessage(msg, message) {
    bot.postMessage(msg.channel, message)
}

function addAliasToUser(alias, userId) {
    let sql = "SELECT * FROM users WHERE userId = ?"
    con.query(sql, userId , function (err,result) {
        if (result[0] !== undefined){
            let userToAddAliasTo = result[0].id
            let newSql = "INSERT INTO alias (alias, userId) VALUES (? , ?)"
            con.query(newSql, [alias, userToAddAliasTo], function(err, result) {
                sendAdminMessage("Alias added to user:" + userId)
            })
        }else{
            console.log("Tried to add alias")
        }
    });
}

function addAliasToUserByAlias(newAlias, currentAlias) {
    let sql = "SELECT * FROM alias WHERE alias = ?"
    con.query(sql, currentAlias , function (err,result) {
        if (result[0] !== undefined){
            let userToAddAliasTo = result[0].userId
            let newSql = "INSERT INTO alias (alias, userId) VALUES (? , ?)"
            con.query(newSql, [newAlias, userToAddAliasTo], function(err, result) {
                sendAdminMessage("Alias " + newAlias + " added to: " + currentAlias)

            })
        }else{
            console.log("Tried to add alias")
        }
    });
}

function addPointsViaAlias(alias, msg) {
    let sql = "SELECT * FROM alias WHERE alias = ?"

    con.query(sql, alias , function (err,result) {
        if (result[0] !== undefined){
            let userToUpdateScore = result[0].userId
            let newSql = "UPDATE users SET score = score + 1 WHERE id = ?"
            con.query(newSql, userToUpdateScore, function(err, result) {
                sendGeneralMessage(msg, 'Point added to ' + alias)
            })
        }else{
            sendGeneralMessage('Can not add point to ' + alias + ' are you sure the alias exists?')
        }
    });
}

function removePointsViaAlias(alias, msg) {
    let sql = "SELECT * FROM alias WHERE alias = ?"
    con.query(sql, alias , function (err,result) {
        if (result[0] !== undefined){
            let userToUpdateScore = result[0].userId
            let newSql = "UPDATE users SET score = score - 1 WHERE id = ?"
            con.query(newSql, userToUpdateScore, function(err, result) {
                sendGeneralMessage(msg, 'Point removed from ' + alias)
            })
        }else{
            sendGeneralMessage(msg, 'Can not add point to ' + alias + ' are you sure the alias exists?')
        }
    });
}

function getScoreViaAlias(alias, msg) {
    let sql = "SELECT * FROM alias WHERE alias = ?"
    con.query(sql, alias , function (err,result) {
            if (result[0] !== undefined){

            let userToGetScoreFor = result[0].userId
            let newSql = "SELECT * FROM users WHERE id = ?"
            con.query(newSql, userToGetScoreFor, function(err, newResult) {
                console.log(newResult)
                if (newResult[0] !== undefined) {
                    sendGeneralMessage(msg, 'Score for  ' + alias + ' is ' + newResult[0].score)
                }else {
                    sendGeneralMessage(msg, 'I have been unable to retrieve the score for alias ' + alias)
                }
            })
        }else{
            sendGeneralMessage(msg, 'Can not get score for ' + alias + ' are you sure the alias exists?')
        }
    });
}

function getLeaderBoard(msg) {
    let sql = "SELECT * FROM users ORDER BY score DESC"
    con.query(sql, function (err, result) {
        let i = 0
        let number
        let item = {}

        let int = setInterval(function() {
            if (result[i] !== undefined) {
                item = result[i]
                number = i + 1
                sendGeneralMessage(msg, '#' + number + ':' + item.name + ':' + item.score)
                i++
            } else {
                clearInterval(int)
            }
        }, 200)
    })
}
