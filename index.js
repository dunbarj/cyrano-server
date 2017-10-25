var express = require('express'),
    request = require('request'),
    bodyParser = require('body-parser'),
    config = require('./config.js'),
    mysql = require('mysql')
    crypto = require('crypto'),
    algorithm = 'aes-256-ctr',
    password = 'JWsmDm5gdkhW4Phm';

var connection = mysql.createConnection({
  host     : config.host,
  user     : config.user,
  password : config.password,
  port     : config.port,
  database : config.database
});

//===== Express =====//
var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function guid() {
    function _p8(s) {
        var p = (Math.random().toString(16)+"000000000").substr(2,8);
        return s ? "" + p.substr(0,4) + "" + p.substr(4,4) : p ;
    }
    return _p8() + _p8(true) + _p8(true) + _p8();
}

function encrypt(text){
  var cipher = crypto.createCipher(algorithm,password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text){
  var decipher = crypto.createDecipher(algorithm,password)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

//Create a user
//userid (auto), username, name, password, fbToken, currency
//username, name, password
app.post('/user/create', function(request, response) {
    var username = request.body.username;
    var full_name = request.body.full_name;
    var password = encrypt(request.body.password);
    connection.query('INSERT INTO users (username, full_name, password) VALUES (\'' + username + '\', \'' + full_name + '\', \'' + password + '\')', function (error, results, fields) {
        if (error) response.send(error);
        console.log(results);
        response.send(results);
    });
});

//Get user info
app.get('/user/', function(request, response) {
    //SPRINT 1 - Traver
    console.log("Server Success");
    var json = request.query;
    if (json.cookie) {
        var sql = "SELECT * FROM users WHERE cookie=\'" + encrypt(json.cookie) + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            var user = results[0];
            if (user !== undefined) {
                user.password = null;
                user.cookie = null;
                response.send(user);
            } else { response.send("User with cookie does not exist");}
        });
    } else { response.sendStatus(400); }
});

//User Login
app.get('/user/login', function(request, response) {
    //SPRINT 1 - Traver
    var json = request.query;
    if (json.username && json.password) {
        var password = encrypt(json.password);
        var sql = "SELECT * FROM users WHERE username=\'" + json.username + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            var user = results[0];
            if (user !== undefined) {
                if (json.username === user.username && password === user.password) {
                    var gid = guid();
                    user.cookie = null;
                    user.password = null;
                    connection.query("UPDATE users SET cookie =\'" + encrypt(gid) +"\' WHERE username=\'" + json.username + "\'", function (er, res, fi) {
                        if (er) throw er;

                    });
                    response.cookie('cookie', gid, { maxAge: 100000000000, httpOnly: false });
                    response.send(user);
                } else { response.send("Username or Password Incorrect"); }
            } else { response.send("User for username does not exist");}
        });
    } else { response.sendStatus(400); }
});

//Edit user information
app.post('/user/:uid/edit', function(request, response) {
    var uid = request.params.uid;
    var username = request.body.username;
    var full_name = request.body.full_name;
    connection.query('UPDATE users SET username = \'' + username + '\', full_name = \'' + full_name + '\' WHERE user_id = ' + uid, function (error, results, fields) {
        if (error) response.send(error);
        response.send(results);
    });
});

//Follow a user
app.post('/user/:uid/follow', function(request, response) {
    
});

//Get a user's posts
app.get('/user/:uid/posts', function(request, response) {
    var uid = request.params.uid;
    connection.query('SELECT * FROM posts WHERE user_id=' + uid, function (error, results, fields) {
        if (error) response.send(error);
        var i = 0;
        for (i = 0; i < results.length; i++) {
            results[i].title = unescape(results[i].title);
            results[i].text_content = unescape(results[i].text_content);
        }
        response.send(results);
    });
});

//Create a post
app.post('/post/create', function(request, response) {
    console.log(request);
    var user_id = request.body.user_id,
        title = request.body.title,
        text_content = request.body.text_content,
        image = request.body.image,
        category = request.body.category,
        bounty = request.body.bounty;
    if (!image) {
        image = "";
    }
    var date = new Date();
    var datestr = date.getUTCFullYear() + "-" + (date.getUTCMonth()+1) + "-" + date.getUTCDate() + " " +
    date.getUTCHours()+ ":" + date.getUTCMinutes() + ":" + date.getUTCSeconds();
    console.log(datestr);
    connection.query('INSERT INTO posts (user_id, time_created, title, text_content, image, category, bounty) VALUES (\'' +
    user_id + '\', TIMESTAMP(\'' + datestr + '\'), \'' + escape(title) + '\', \'' + escape(text_content) + '\', \'' + image +
    '\', \'' + category + '\', \'' + bounty + '\')', function (error, results, fields) {
        if (error) response.send(error);
        response.send(results);
    });
});

//Search for posts by category
app.get('/post/search', function(request, response) {
    var category = request.query.category;
    connection.query('SELECT * FROM posts WHERE category=\'' + category + '\'', function (error, results, fields) {
        if (error) response.send(error);
        var i = 0;
        for (i = 0; i < results.length; i++) {
            results[i].title = unescape(results[i].title);
            results[i].text_content = unescape(results[i].text_content);
        }
        response.send(results);
    });
});

//Get the feed
app.get('/post/feed', function(request, response) {
    console.log("Works")
    //SPRINT 1 - Traver
    var json = request.query;
    if(json.type === 'new') {
        var sql = "SELECT * FROM posts ORDER BY time_created DESC LIMIT 50";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            var i = 0;
            for (i = 0; i < results.length; i++) {
                results[i].title = unescape(results[i].title);
                results[i].text_content = unescape(results[i].text_content);
            }
            response.send(results);
        });
    } else if (json.type === 'top') {
        var sql = "SELECT * FROM posts ORDER BY (up_votes-down_Votes)*10 + views DESC LIMIT 50";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            for (i = 0; i < results.length; i++) {
                results[i].title = unescape(results[i].title);
                results[i].text_content = unescape(results[i].text_content);
            }
            response.send(results);
        });
    } else { response.sendStatus(400); }

});

//Get post
app.get('/post/:pid', function(request, response) {
    //SPRINT 1 - Traver
    var postId = request.params.pid;
    if (postId) {
        var sql = "SELECT * FROM posts WHERE post_id=\'" + postId + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            var post = results[0];
            if (post !== undefined) {
                post.title = unescape(post.title);
                post.text_content = unescape(post.text_content);
                response.send(post);
            } else { response.send("Post does not exist");}
        });
    } else { response.sendStatus(400); }

});

//Edit a post //insert into posts (user_id, time_created, title, text_content, category) values(1, TIMESTAMP('2017-09-09 09:09:09'), 'hello world', 'lots and lots and lots of words', 'other');
app.post('/post/:pid', function(request, response) {
    //SPRINT 1 - Traver
    var postId = request.params.pid;
    var json = request.body;
    if (postId && json.text_content) {
        var sql = "UPDATE posts SET text_content = \'" + escape(json.text_content) +"\' WHERE post_id=\'" + postId + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            response.send(results);
        });
    } else { response.sendStatus(400); }
});

//Delete a post
app.delete('/post/:pid', function(request, response) {
    //SPRINT 1 - Traver
    var postId = request.params.pid;
    if (postId) {
        var sql = "DELETE FROM posts WHERE post_id=\'" + postId + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            response.send(results);
        });
    } else { response.sendStatus(400); }
});

//Close a post
app.post('/post/:pid/close', function(request, response) {
    var postId = request.params.pid;
    var json = request.body;
    if (postId && json.reply_id) {

        var sql = "UPDATE replies SET is_best_answer = 1 WHERE reply_id=\'" + json.reply_id + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            var sql1 = "UPDATE posts SET has_best_answer = 1 WHERE post_id=\'" + postId + "\'";
            connection.query(sql1, function (error1, results1, fields1) {
                if (error1) throw error1;
                response.send(results);
            });
        });
    } else { response.sendStatus(400); }
});

//Reply to a post
app.post('/post/:pid/reply', function(request, response) {
    //SPRINT 1 - Traver
    var postId = request.params.pid;
    var json = request.body;
    if (postId && json.user_id && json.text_content) {
        var sql = "INSERT INTO replies (post_id, user_id, text_content) value (\'" + postId + "\', \'" + json.user_id +
        "\', \'" + escape(json.text_content) + "\')";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            response.send(results);
        });
    } else { response.sendStatus(400); }
});

//Vote on a post
app.get('/post/:pid/vote', function(request, response) {
    
});

//Get all post replies
app.get('/post/:pid/reply/all', function(request, response) {
    var postid = request.params.pid;
    var userid = request.query.user_id;
    if (postid && userid) {
        var sql = "SELECT reply_id, post_id, replies.user_id, text_content, image, is_best_answer, username FROM replies " +
        "INNER JOIN users ON replies.user_id=users.user_id WHERE CASE WHEN ((SELECT user_id FROM posts WHERE post_id =" + postid +
         ") =" + userid + ") THEN post_id =" + postid + " AND is_hidden = 0 ELSE post_id = "+ postid +" END";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            var i = 0;
            for (i = 0; i < results.length; i++) {
                results[i].text_content = unescape(results[i].text_content);
            }
            response.send(results);
        });
    } else { response.sendStatus(400); }
});

//Get a specific reply to a post
app.get('/post/:pid/reply/:rid', function(request, response) {
    
});

//Delete a reply
app.delete('/post/:pid/reply/:rid', function(request, response) {
    
});

//Vote on a post
app.post('/post/:pid/reply/:rid/vote', function(request, response) {
    
});

//Hide a post
app.post('/post/:pid/reply/:rid/hide', function(request, response) {
    var postId = request.params.pid;
    var replyId = request.params.rid;
    if (postId && replyId) {
        var sql = "UPDATE replies SET is_hidden = 1 WHERE reply_id=\'" + replyId + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            response.send(results);
        });
    } else { response.sendStatus(400); }
});

//Report a post
app.post('/post/:pid/reply/:rid/report', function(request, response) {
    
});

//Admin delete a post
app.delete('/admin/post/:pid', function(request, response) {
    
});

//Admin delete a reply to a post
app.delete('/admin/post/:pid/reply/:rid', function(request, response) {
    
});

//Send a message to a user (mid)
app.post('/user/:uid/message/:mid', function(request, response) {
    
});

//Get all messages
app.get('/user/:uid/messages', function(request, response) {
    
});


//===== PORT =====//
var port = process.env.PORT || 5000;
app.listen(port);
console.log("Cyrano server started at :" + port);
