var SlackBot = require("slackbots")
var firebase = require('firebase')

// const envKey = process.env.BOT_TOKEN
const envKey = 'xoxb-457431337684-456996751393-Ns7pq3DmgpwGKywVTYwFiGKd'

var points = []

// create a bot
var bot = new SlackBot({
  token: envKey,
  name: "++ Bot"
})

bot.on('start' , function () {
  bot.postMessageToChannel('general', 'Plus plus bot is here :P')
})

bot.on("message", msg => {
  switch (msg.type) {
    case "message":
      // we only want to listen to direct messages that come from the user
      if (msg.text.includes('++')) {
          let text = msg.text
          let name = text.split('+')[0]
          addPointToUser(name)
      }else if (msg.text.includes('--')) {
          let text = msg.text
          let name = text.split('-')[0]
          removePointFromUser(name)
      }else if (msg.text.includes('??')) {
          let text = msg.text
          let name = text.split('?')[0]
          getUserScore(name)
      }else if (msg.text.includes('||')) {
          getLeaderBoard()
      }
      break
  }
})

const addPointToUser = (name) => {
  updatePointsForUser(name, true)
}

const removePointFromUser = (name) => {
  updatePointsForUser(name, false)
}

function getUserScore(name) {
    points.forEach(function (item){
        if (item.name === name) {
            bot.postMessageToChannel('general', name + "'s current score is: " + item.score)
            return
        }
    })
}

function updatePointsForUser(name, add) {
    var existing = false;

    points.forEach(function (item){
        console.dir(item)
        if (item.name === name) {
          if (add) {
              item.score = item.score + 1
          }else {
              item.score = item.score - 1
          }

          if (item.score < 0) {
            bot.postMessageToChannel('general', name + ' has no points so you cant remove them ;)')
          }

          existing = true
        }
    })

    if (!existing) {
        // create the new js object
        obj = {}
        obj['name'] = name
        obj['score'] = 1

        points.push(obj)
        bot.postMessageToChannel('general', 'Welcome to the leaderboard ' + name)
    }
}

function getLeaderBoard() {
    var board = points.sort(function (p1, p2) {

        if (p1.score > p2.score) return -1;
        if (p1.score < p2.score) return 1;

        if (p1.name > p2.name) return 1;
        if (p1.name < p2.name) return -1;

    })
    var i = 0
    bot.postMessageToChannel('general', '#1 : ' + board[0].name)
    bot.postMessageToChannel('general', '#2 : ' + board[1].name)
    bot.postMessageToChannel('general', '#3 : ' + board[2].name)
    bot.postMessageToChannel('general', '#4 : ' + board[3].name)
    bot.postMessageToChannel('general', '#5 : ' + board[4].name)

}
