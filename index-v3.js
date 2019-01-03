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
const blockCount = 2

// create a bot
var bot = new SlackBot({
  token: envKey,
  name: "++ Bot v3"
})

bot.on('start' , function () {
  sendAdminMessage("`++Bot V3` Online")
  authenticateDevless();
  var now = new Date();

  var delay = 30 * 60 * 1000; // 30 mins in msec
  var start = delay - (now.getMinutes() * 30 + now.getSeconds()) * 1000 + now.getMilliseconds();


  // Reauth & clear blocks every 30 mins
  setInterval(tick, 60000);
})

function tick()
{
  //get the mins of the current time
  var mins = new Date().getMinutes();
  if(mins == "30"){
    console.log("Running Tasks")
    authenticateDevless()
    resetBlocks()
  }
  console.log('Tick ' + mins);
}

/**
 * When the bot turns on
 */
bot.on("message", msg => {
  if (msg.user === botAdmin) {
    adminFunctions(msg.text, msg)
  } else {
    userFunctions(msg.text, msg)
  }
})

/**
 * List of admin functions
 *
 * @param command
 * @param msg
 */
function adminFunctions(command, msg) {
  switch (command) {
    case '++configure':
      configureForSlackServer()
      break
    case '++uninstall':
      uninstall()
      break
    case '++clearBlocks':
      resetBlocks()
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

/**
 * List of user functions
 *
 * @param command
 * @param msg
 */
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
      if (command !== undefined && !command.includes('`')) {
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

/**
 * Add a alias to a user by Alias
 *
 * @param alias
 * @param newAlias
 * @param msg
 */
function addAliasToUserByAlias(alias, newAlias, msg) {
  getUserFromAlias(alias, msg).then(function (userId) {
    addAliasToUser(newAlias, userId, msg)
  })
}

/**
 * Configures the slack server
 */
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
  getUserFromSlackId(msg.user).then(function (sender) {

    // Remove the plus plus from the message and any spaces and get a comment
    let alias = message.split('++')[0].split(' ').splice(-1)[0]
    let comment = message.split('#')[1]

    if (alias.trim() === '') {
      return
    }

    if (comment !== undefined) {
      comment = comment.trim()
    }
    let senderUser = sender.payload.results[0]

    if (senderUser.bounceNumber < blockCount &&
      senderUser.blocked === 0) {


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

            // Update the sender
            let senderData = {
              bounceNumber: senderUser.bounceNumber += 1
            }

            sendGeneralMessage(msg, "Point added to " + alias)
            updateUser(senderUser.id, senderData);

            if (comment !== undefined) {
              addComment(comment, msg, user, '++')
            }
          }
        })
      })
    } else {
      sendGeneralMessage(msg, 'Sorry ' + sender.payload.results[0].name + ' you are temporarily banned from updating scores' +
        ' (too many requests)')
    }
  });
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

  getUserFromSlackId(msg.user).then(function (sender) {


  // Remove the plus plus from the message and any spaces and get a comment
  let alias = message.split('--')[0].split(' ').splice(-1)[0]
  let comment = message.split('#')[1]

  if (alias.trim() === '') {
    return
  }

  if (comment !== undefined) {
    comment = comment.trim()
  }

  let senderUser = sender.payload.results[0]

  if (senderUser.bounceNumber < blockCount &&
    senderUser.blocked === 0) {

      getUserFromAlias(alias, msg).then(function (id) {
        getUserFromDevLess(id).then(function (user) {
          user = user.payload.results[0]
          if (user.user_id === msg.user) {
            sendGeneralMessage(msg, "Sorry: " + alias + " you cannot minus minus yourself!")
          } else {
            let data = {
              score: user.score -= 1,
            }
            sendGeneralMessage(msg, "Point removed from " + alias)
            updateUser(user.id, data)

            // Update the sender
            let senderData = {
              bounceNumber: senderUser.bounceNumber += 1
            }
            updateUser(senderUser.id, senderData);


            if (comment !== undefined) {
              addComment(comment, msg, user, '--')
            }
          }
        })
      })
    } else {
      sendGeneralMessage(msg, 'Sorry ' + sender.payload.results[0].name + ' you are temporarily banned from updating scores')
    }
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

/**
 * Add a comment to the history table
 *
 * @param comment
 * @param msg
 * @param recepient
 * @param action
 */
function addComment(comment, msg, recepient, action) {
  getUserFromSlackId(msg.user).then(function (sender) {
    let data = {
      comment: comment,
      senderuserid: sender.payload.results[0].id,
      senderUser: sender.payload.results[0].name,
      recepientuserid: recepient.id,
      action: action
    }

    dv.addData(devLessService, 'history', data, function (response) {
      console.log(response)
    })
  })
}

/**
 * Update a user in devless
 *
 * @param userId
 * @param data
 */
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

/**
 * uninstall thee app.
 */
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
    console.dir(response)
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

/**
 * Create an alias in devless
 *
 * @param data
 * @param user
 */
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
    console.dir(response)
    if (response.status_code === 637) {
      return true
    }
    return false
  })
}

/**
 * Get a user from a devLess id
 *
 * @param userId
 * @return {Promise<any>}
 */
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
          resolve()
        }
      } else {
        if (response.payload.results.length > 0) {
          resolve(response)
        }
      }
    })
  });
}

/**
 * Get a user from a slack ID
 *
 * @param slackId
 * @return {Promise<any>}
 */
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
          resolve()
        }
      } else {
        if (response.payload.results.length > 0) {
          resolve(response)
        }
      }
    })
  });
}

/**
 * Gets a user from an alias
 *
 * @param alias
 * @param msg
 * @return {Promise<any>}
 */
function getUserFromAlias(alias, msg) {
  return new Promise((resolve, reject) => {

    let searchParam = "alias," + alias.toString().toLowerCase()
    let params = {
      where: [searchParam]
    }

    dv.queryData(devLessService, 'alias', params, function (response) {
      if (response.status_code === 628) {
        if (authenticateDevless()) {
          getUserFromAlias(alias)
          resolve()
        }
      } else {
        if (response.payload !== undefined && response.payload.results.length > 0) {
          resolve(response.payload.results[0]['user_id'])
        } else {
          resolve(false)
          sendGeneralMessage(msg, "Alias: '" + alias + "' not found are you sure it exists?")
        }
      }
    })
  });
}

/**
 * Gets all users ordered by the score
 *
 * @return {Promise<any>}
 */
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

  });
}

/**
 * Sends a message to the channel the bot was contacted on
 * @param msg
 * @param message
 */
function sendGeneralMessage(msg, message) {
  bot.postMessage(msg.channel, message)
}

/**
 * Sends a message to the admin
 * @param message
 */
function sendAdminMessage(message) {
  bot.postMessage(botAdmin, message)
}

/**
 * Gets the recent history for a user
 * @param userId
 * @return {Promise<any>}
 */
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
          resolve()

        }
      } else {
        let string = "Recent changes to this user: \n"

        if (response.payload.results.length >= 1) {
          response.payload.results.forEach(function (item) {
            string += item.action + ' for "' + item.comment + '" from ' + item.senderUser + ' \n'
          })
        } else {
          string += 'No comments for this user'
        }

        resolve(string)
      }
    })
  });
}

/**
 * Reset all blocks
 */
function resetBlocks() {
  let params = {
    'greaterThan': ["bounceNumber,0"],
    'orWhere': "blocked,1"
  }

  dv.queryData(devLessService, 'user', params, function (response) {
    if (response.status_code === 628) {
      if (authenticateDevless()) {
        resetBlocks()
      }
    } else {

      response.payload.results.forEach(function (item) {
        // Update the sender
        let data = {
          bounceNumber: 0,
          blocked: 0
        }
        updateUser(item.id, data);
      })
    }
  })
}


