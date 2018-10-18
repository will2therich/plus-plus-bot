export function findUserByAlias(bot, string, alias = true) {
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

export function findUserById(bot, id) {
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

export function configureForAllUsers(bot) {
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
          createUser(item.id)
        }
      });
    })
  })
}

export function createUser(bot, slackUser) {
  let sql = "INSERT INTO users (userId, score) VALUES (? , 0)"
  con.query(sql, slackUser.id , function (err,result) {
  })
}


export function findUserBySlackId(bot, id) {
  bot.getUserById(id).then(function (data) {
    sendAdminMessage(bot, 'User Details: Name:' + data.name)
    sendAdminMessage(bot ,'Real Name:' + data.profile.real_name)
  })
}

export function getAllUsers (bot) {
  bot.getUsers().then(function (data) {
    console.log(data)
    sendAdminMessage(bot, 'All users are as follow')
    let i = 1;

    data.members.forEach(function(item) {
      sendAdminMessage(bot, '#' + i + ';Slack id:' + item.id + ';Slack name:' + item.name + ';Slack real name:' + item.real_name);
      i++
    })
  })
}

export function sendAdminMessage(bot, message) {
  bot.bot.postMessage(bot.botAdmin, message)
}
