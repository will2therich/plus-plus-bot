var SlackBot = require("slackbots")

const envKey = process.env.BOT_TOKEN
let points = []

let bannedWords = [
    '',
    'cactus',
    'name',
    '`name',
]

// create a bot
var bot = new SlackBot({
  token: envKey,
  name: "++ Bot"
})

bot.on('start' , function () {
  console.log("Bot Started")
  bot.postMessageToChannel('general', 'My incompetent coder has fixed me!')
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
        if (item.name.toLowerCase() === name.toLowerCase()) {
            bot.postMessageToChannel('general', name + "'s current score is: " + item.score)
            return
        }
    })
}

function updatePointsForUser(name, add) {
    var existing = false;
    if (bannedWords.indexOf(name.toLowerCase()) > -1) {
     console.log('Banned word provided')
    } else {

        points.forEach(function (item) {
            console.dir(item)
            if (item.name.toLowerCase() === name.toLowerCase()) {
                if (add) {
                    item.score = item.score + 1
                } else {
                    item.score = item.score - 1
                }

                existing = true
            }
        })

        if (!existing) {
            // create the new js object
            obj = {}
            obj['name'] = name

            if (add) {
                obj['score'] = 1
            } else {
                obj['score'] = -1
            }

            points.push(obj)
            bot.postMessageToChannel('general', 'Welcome to the leaderboard ' + name)
        }
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
  var int = setInterval(function() {
    var number = i + 1;
    if (i < 5) {
      if (i in board) {
        bot.postMessageToChannel('general', '#' + number + ': ' + board[i].name + ':' + board[i].score)
        i++;
      }else {
        clearInterval(int)
      }
    }else {
      clearInterval(int)
    }
  }, 500)
}
