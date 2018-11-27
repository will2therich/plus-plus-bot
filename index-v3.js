var SlackBot = require("slackbots")
const DevLess = require('./devless');

const envKey = process.env.BOT_TOKEN
const botAdmin = process.env.BOT_ADMIN_NAME
// DevLess stuff
const apiBaseUrl = process.env.BOT_API_URL
const devLessToken = process.env.BOT_API_TOKEN
const devLessService = process.env.BOT_API_SERVICE
const devLessUsername = process.env.BOT_API_USERNAME
const devLessPassword = process.env.BOT_API_PASSWORD

const dv = new DevLess(apiBaseUrl, devLessToken)

// create a bot
var bot = new SlackBot({
  token: envKey,
  name: "++ Bot v3 Test"
})

bot.on('start' , function () {
  sendAdminMessage("V3 Online")
  authenticateDevless();

  // Reauth every halfhour
  setInterval(authenticateDevless, 1000 * 60 * 30)
})


bot.on("message", msg => {
  if (msg.user === botAdmin) {
    adminFunctions(msg.text, msg)
  } else {
    userFunctions(msg.text, msg)
  }
})

function adminFunctions(command, msg) {
  switch (command) {
    case '++configure':
      configureForSlackServer()
      break
    case '++uninstall':
      uninstall()
      break
    default:
      if (command !== undefined) {
        if (command.includes('++delete')) {
          let userId = command.split('-')[1]
          deleteUser(userId)
        } else if (command.includes('++addAlias')) {
          let userAlias = command.split('-')[1]
          let newUserAlias = command.split('-')[2]

          addAliasToUserByAlias(userAlias, newUserAlias, msg)
          break;
        }
      }

      userFunctions(command, msg)
  }
}

function userFunctions(command, msg) {
  switch (command) {
    case '++bot':
      sendGeneralMessage(msg, "Hello!")
      break
    case '++Bot':
      sendGeneralMessage(msg, "Hello!")
      break
    case '||':
      getLeaderboard(msg)
      break
    default:
      if (command !== undefined) {
        if (command.includes('++')) {
          // Plus Plus points
          addPointsToUser(command, msg)
        } else if (command.includes('--')) {
          removePointsFromUser(command, msg)
        } else if (command.includes('??')) {
          getPointsForAUser(command, msg)
        }
      }

      break;
  }
}

function addAliasToUserByAlias(alias, newAlias, msg) {
  getUserFromAlias(alias, msg).then(function (userId) {
    addAliasToUser(newAlias, userId, msg)
  })
}

function configureForSlackServer() {
  bot.getUsers().then(function (data) {
    data.members.forEach(function(item) {
      let userObj = {
        "score": 0,
        "user_id": item.id,
        "bounceNumber": 0,
        "blocked": 0,
        "name": item.profile.display_name
      }

      createUser(userObj, item)
    })
  })
  sendAdminMessage("Sync Completed")
}

/**
 * Adds an alias to a user
 *
 * @param alias
 * @param user
 */
function addAliasToUser(alias, user_id, user) {
  let aliasObj = {
    "user_id": user_id,
    'alias': alias
  }

  createAlias(aliasObj, user)
}

/**
 * Adds points to a user
 *
 * @param message
 * @param msg
 */
function addPointsToUser(message, msg) {

  // Remove the plus plus from the message and any spaces and get a comment
  let alias = message.split('++')[0].split(' ').splice(-1)[0]
  let comment = message.split('~')[1]

  if (alias.trim() === '') {
    return
  }

  if (comment !== undefined) {
    comment = comment.trim()
  }

  getUserFromAlias(alias, msg).then(function (id) {
    getUserFromDevLess(id).then(function (user) {
      user = user.payload.results[0]
      if (user.user_id === msg.user) {
        sendGeneralMessage(msg, "Sorry: " + alias + " you cannot plus plus yourself!")
      } else {
        let data = {
          score: user.score += 1
        }
        updateUser(user.id, data)

        if (comment !== undefined) {
          addComment(comment, msg, user, '++')
        }
      }
    })
  })
}

/**
 * Adds points to a user
 *
 * @param msg
 */
function getLeaderboard(msg) {
  let i = 1
  let string = ''

  getAllUsersOrderedByScore().then(function (bored) {
    bored.payload.results.forEach(function (item) {
      string += '#' + i + ': ' + item.name + ': ' + item.score
      string += '\n'
      i++
    })

    sendGeneralMessage(msg, string)
  })
}

/**
 * Removes points to a user
 *
 * @param message
 * @param msg
 */
function removePointsFromUser(message, msg) {

  // Remove the plus plus from the message and any spaces and get a comment
  let alias = message.split('--')[0].split(' ').splice(-1)[0]
  let comment = message.split('#')[1]

  if (alias.trim() === '') {
    return
  }

  if (comment !== undefined) {
    comment = comment.trim()
  }

  getUserFromAlias(alias, msg).then(function (id) {
    getUserFromDevLess(id).then(function (user) {
      user = user.payload.results[0]
      if (user.user_id === msg.user) {
        sendGeneralMessage(msg, "Sorry: " + alias + " you cannot minus minus yourself!")
      } else {
        let data = {
          score: user.score -= 1
        }
        updateUser(user.id, data)

        if (comment !== undefined) {
          addComment(comment, msg, user, '--')
        }
      }
    })
  })
}

/**
 * Gets the points for a user
 *
 * @param message
 * @param msg
 */
function getPointsForAUser(message, msg) {

  // Remove the plus plus from the message and any spaces and get a comment
  let alias = message.split('??')[0].split(' ').splice(-1)[0]

  getUserFromAlias(alias, msg).then(function (id) {
    getUserFromDevLess(id).then(function (user) {
      user = user.payload.results[0]
      let string = "Score for " + user.name + " is " + user.score + "\n"

      getRecentHistory(user.id).then(function (historyString) {
        string += historyString

        sendGeneralMessage(msg, string)
      })
    })
  })
}

function addComment(comment, msg, recepient, action) {
  getUserFromSlackId(msg.user).then(function (sender) {
    let data = {
      comment: comment,
      senderuserid: sender.payload.results[0].id,
      recepientuserid: recepient.id,
      action: action
    }

    dv.addData(devLessService, 'history', data, function (response) {
      console.log(response)
    })
  })
}

function updateUser(userId, data) {
  dv.updateData(devLessService, 'user', 'id', userId, data, function (response) {
    console.log(response)
    if (response.status_code === 628) {
      if (authenticateDevless()) {
        updateUser(userId, data)
      }
    }
  });
}

function uninstall() {
  bot.getUsers().then(function (data) {
    data.members.forEach(function(item) {
      deleteUser(item.id)
    })
  })
  sendAdminMessage("Uninstall Completed")
}

/**
 * Adds a user to DevLess
 *
 * @param data
 * @param user
 */
function createUser(data, user) {
  dv.addData(devLessService, 'user', data, function (response) {
    if (response.status_code === 628) {
      if (authenticateDevless()) {
        createUser(data, user)
      }
    } else {
      if (response.status_code === 609) {
        console.log("Successfully added user")
        addAliasToUser(user.name, response.payload.entry_id, user)
      }
    }
  });
}

function createAlias(data, user) {
  dv.addData(devLessService, 'alias', data, function (response) {
    if (response.status_code === 628) {
      if (authenticateDevless()) {
        createAlias(data, user)
      }
    } else {
      if (response.status_code === 609) {
        console.log("Successfully added alias")
      }
    }
  });
}

/**
 * Deletes a user from DevLess
 *
 * @param userId
 */
function deleteUser(userId) {
  dv.deleteData(devLessService, 'user', 'user_id', userId, function (response) {
    console.log(response)
    if (response.status_code === 628) {
      if (authenticateDevless()) {
        deleteUser(userId)
      }
    } else {
      if (response.status_code === 636) {
        console.log("Successfully deleted user")
      } else {
        sendAdminMessage("Error deleting user: " + userId)
      }
    }
  });
}

/**
 * Authenticates DevLess
 * @returns boolean
 */
function authenticateDevless() {
  dv.authenticate('login', [devLessUsername, '', '', devLessPassword], function (response) {
    if (response.status_code === 637) {
      return true
    }
    return false
  })
}

function getUserFromDevLess(userId) {
  return new Promise((resolve, reject) => {

    let searchParam = "id," + userId;
    let params = {
      where: [searchParam]
    }

    dv.queryData(devLessService, 'user', params, function (response) {
      if (response.status_code === 628) {
        if (authenticateDevless()) {
          getUserFromDevLess(userId)
        }
      } else {
        if (response.payload.results.length > 0) {
          resolve(response)
        }
      }
    })
  });
}

function getUserFromSlackId(slackId) {
  return new Promise((resolve, reject) => {

    let searchParam = "user_id," + slackId;
    let params = {
      where: [searchParam]
    }

    dv.queryData(devLessService, 'user', params, function (response) {
      if (response.status_code === 628) {
        if (authenticateDevless()) {
          getUserFromDevLess(slackId)
        }
      } else {
        if (response.payload.results.length > 0) {
          resolve(response)
        }
      }
    })
  });
}

function getUserFromAlias(alias, msg) {
  return new Promise((resolve, reject) => {

    let searchParam = "alias," + alias.toString()
    let params = {
      where: [searchParam]
    }

    dv.queryData(devLessService, 'alias', params, function (response) {
      if (response.status_code === 628) {
        if (authenticateDevless()) {
          getUserFromAlias(alias)
        }
      } else {
        if (response.payload.results.length > 0) {
          resolve(response.payload.results[0]['user_id'])
        } else {
          sendGeneralMessage(msg, "Alias: '" + alias + "' not found are you sure it exists?")
        }
      }
    })
  });
}

function getAllUsersOrderedByScore() {
  return new Promise((resolve, reject) => {
    let params = {
      desc:"score"
    }

    dv.queryData(devLessService, 'user', params, function (response) {
      if (response.status_code === 628) {
        if (authenticateDevless()) {
          getAllUsersOrderedByScore()
        }
        } else {
          resolve (response)
        }
    })

  });}

function sendGeneralMessage(msg, message) {
  bot.postMessage(msg.channel, message)
}

function sendAdminMessage(message) {
  bot.postMessage(botAdmin, message)
}

function getRecentHistory(userId) {
  return new Promise((resolve, reject) => {

    let params = {
      where: ["recepientuserid," + userId],
      size: 3,
      desc:"id"
    }

    dv.queryData(devLessService, 'history', params, function (response) {
      if (response.status_code === 628) {
        if (authenticateDevless()) {
          getRecentHistory(userId)
        }
      } else {
        let string = "Recent changes to this user \n"

        response.payload.results.forEach(function (item) {
          string += item.action + ' for ' + item.comment + ' \n'
        })

        resolve(string)
      }
    })
  });
}


