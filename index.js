var express = require('express'),
    request = require('request'),
    bodyParser = require('body-parser'),
    config = require('./config.js'),
    mysql = require('mysql');

var connection = mysql.createConnection({
  host     : config.host,
  user     : config.user,
  password : config.password,
  port     : config.port,
  database : config.database
});

//===== Express =====//
var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//TEST CALL
app.get('/', function(request, response) {
	connection.query('SELECT * FROM users', function (error, results, fields) {
  		if (error) response.send(error);
        console.log(results);
  		response.send(results);
	});
});

//Create a user
//userid (auto), username, name, password, fbToken, currency
//username, name, password
app.post('/user/create', function(request, response) {
    var username = request.body.username;
    var full_name = request.body.full_name;
    var password = request.body.password;
    
    connection.query('INSERT INTO users (username, full_name, password) VALUES (' + username + ', ' + full_name + ', ' + password + ')', function (error, results, fields) {
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
        var sql = "SELECT * FROM users WHERE cookie=\'" + json.cookie + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            var user = results[0];
            if (user !== undefined) {
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
        var sql = "SELECT * FROM users WHERE username=\'" + json.username + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            var user = results[0];
            if (user !== undefined) {
                if (json.username === user.username && json.password === user.password) {
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
    connection.query('UPDATE users SET username = ' + username + ', full_name = ' + full_name + ' WHERE user_id = ' + uid, function (error, results, fields) {
        if (error) response.send(error);
        console.log(results);
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
        console.log(results);
        response.send(results);
    });
});

//Create a post
app.post('/post/create', function(request, response) {
    var user_id = response.body.user_id,
        title = response.body.title,
        text_content = response.body.text_content,
        image = response.body.image,
        category = response.body.category,
        bounty = response.body.bounty;
    
    connection.query('INSERT INTO posts (user_id, title, text_content, image, category, bounty) VALUES (' + user_id + ', ' + title + ', ' + text_content + ', ' + image + ', ' + category + ', ' + bounty + ')', function (error, results, fields) {
        if (error) response.send(error);
        console.log(results);
        response.send(results);
    });
});

//Search for posts by category
app.get('/post/search', function(request, response) {
    var category = request.query.category;
    connection.query('SELECT * FROM posts WHERE category=' + category, function (error, results, fields) {
        if (error) response.send(error);
        console.log(results);
        response.send(results);
    });
});

//Get the feed
app.get('/post/feed', function(request, response) {
    console.log("Works")
    //SPRINT 1 - Traver
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
                response.send(post)
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
        var sql = "UPDATE posts SET text_context = " + json.text_content +" WHERE post_id=\'" + postId + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            response.send(results)
        });
    } else { response.sendStatus(400); }
});

//Delete a post
app.delete('/post/:pid', function(request, response) {
    //SPRINT 1 - Traver
    var postId = request.params.pid;
    if (postId) {
        var sql = "DELETE FROM WHERE post_id=\'" + postId + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            response.send(results)
        });
    } else { response.sendStatus(400); }
});

//Close a post
app.post('/post/:pid/close', function(request, response) {
    
});

//Reply to a post
app.post('/post/:pid/reply', function(request, response) {
    //SPRINT 1 - Traver
    var postId = request.params.pid;
    var json = request.body;
    if (postId && json.user_id && json.text_content) {
        var sql = "INSERT INTO replies (post_id, user_id, text_content) value (" + postId + ", " + json.user_id +
        ", " + json.text_content + ")";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            response.send(results)
        });
    } else { response.sendStatus(400); }
});

//Vote on a post
app.get('/post/:pid/vote', function(request, response) {
    
});

//Get all post replies
app.get('/post/:pid/reply/all', function(request, response) {
    
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
