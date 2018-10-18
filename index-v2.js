import {
  sendAdminMessage,
  findUserByAlias,
  getAllUsers,
  configureForAllUsers
}  from './adminFunctions'

var SlackBot = require("slackbots")
var mysql = require('mysql');

// const envKey = process.env.BOT_TOKEN
// const botAdmin = process.enc.BOT_ADMIN_NAME

const envKey = 'xoxb-457431337684-456996751393-Ns7pq3DmgpwGKywVTYwFiGKd'
const botAdmin = 'UDGUPBNMU'

// let con = mysql.createConnection({
//   host: process.env.SQL_HOST,
//   user: process.env.SQL_USER,
//   password: process.env.SQL_PASSWORD,
//   database: process.env.SQL_DATABASE
// });

let con = mysql.createConnection({
  host: 'm60mxazb4g6sb4nn.chr7pe7iynqr.eu-west-1.rds.amazonaws.com',
  user: 'h31mmafkc9nihjf0',
  password: 'x7r20nucz0fbg74j',
  database: 'lqub42183532bjcy'
});


var points = []

// create a bot
var slackBot = new SlackBot({
  token: envKey,
  name: "++ Bot V2"
})

let bot = {
  bot: slackBot,
  botAdmin: botAdmin
}

bot.bot.on('start' , function () {
  sendAdminMessage(bot, 'Plus Plus Bot V2 Is online')
  con.connect(function(err) {
    if (err) throw err;
   sendAdminMessage(bot, 'SQL Connected')
  });
})

bot.bot.on('message', function(data) {
  // all ingoing events https://api.slack.com/rtm
  // console.log(data);
  if (data.type === 'message') {
    if (data.user === botAdmin) {
      if (data.text.includes('addAlias')) {

      }else if (data.text.includes('findAlias')) {
        let name = data.text.split('-')[1]
        findUserByAlias(bot, name)
      }else if (data.text === 'allUsers') {
        getAllUsers(bot);
      } else if (data.text === 'configure') {
        configureForAllUsers(bot)
      }
    }
  }
});

