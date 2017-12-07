var express = require('express'),
    request = require('request'),
    bodyParser = require('body-parser'),
    config = require('./config.js'),
    mysql = require('mysql')
    crypto = require('crypto'),
    keyword_extractor = require("keyword-extractor"),
    algorithm = 'aes-256-ctr',
    password = 'JWsmDm5gdkhW4Phm';

var connection = mysql.createConnection({
  host     : config.host,
  user     : config.user,
  password : config.password,
  port     : config.port,
  database : config.database
});

var admin = require("firebase-admin");
var serviceAccount = require("./ServiceAccount/ServiceAccountKey.json");


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cyrano-app.firebaseio.com"
});

var post_report_threshold = 3;
var reply_report_threshold = 3;


//===== Express =====//
var app = express();
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(bodyParser.json({limit: '100mb'}));

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
    connection.query('INSERT INTO users (username, full_name, password, currency) VALUES (\'' + username + '\', \'' + full_name + '\', \'' + password + '\',' + ' \'100\')', function (error, results, fields) {
        if (error) response.send(error);
        console.log(results);
        response.send(results);
    });
});

app.post('/user/fbcreate', function(request, response) {
    var username = request.body.username;
    var full_name = request.body.full_name;
    var token = encrypt(request.body.token);
    connection.query('INSERT INTO users (username, full_name, facebook_token, currency) VALUES (\'' + username + '\', \'' + full_name + '\', \'' + token + '\',' + ' \'100\')', function (error, results, fields) {
        if (error) response.send(error);
        response.send(results);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
    });
});

//Get user info
app.get('/user/', function(request, response) {
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

//User Login
app.get('/user/fblogin', function(request, response) {
    var json = request.query;
    if (json.token) {
        var token = encrypt(json.token);
        console.log("token: " + token);
        var sql = "SELECT * FROM users WHERE facebook_token=\'" + token + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            var user = results[0];
            if (user !== undefined) {
                var gid = guid();
                user.cookie = null;
                user.password = null;
                connection.query("UPDATE users SET cookie =\'" + encrypt(gid) +"\' WHERE facebook_token=\'" + token + "\'", function (er, res, fi) {
                    if (er) throw er;

                });
                response.cookie('cookie', gid, { maxAge: 100000000000, httpOnly: false });
                response.send(user);
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
        response.send(reportFilter(results));
    });
});

//Tip a user, sends back status code 200 on success
app.post('/user/:uid/tip', function(request, response) {
    var user_from = request.body.user_id,
        user_to = request.params.uid,
        amount = request.body.amount;
    exchangeCurrency(user_from, user_to, amount, function (result) {
        if (result < 0) {
            console.log("Currency exchange from user " + user_from + " to user " + user_to + " has failed!");
            response.send("failed");
            return;
        }
        response.send("success");
    });
});

//Give a user a device id for notifications
app.post('/user/:uid/deviceId', function(request, response) {
    var user_id = request.params.uid,
        device_id = request.body.device_id;
    connection.query('UPDATE users SET device_id = \'' + device_id + '\' WHERE user_id = ' + user_id, function (error, results, fields) {
        if (error) response.send(error);
        response.send(results);
    });
});

//Create a post
app.post('/post/create', function(request, response) {
    var user_id = request.body.user_id,
        title = request.body.title,
        text_content = request.body.text_content,
        image = request.body.image1,
        image2 = request.body.image2,
        image3 = request.body.image3,
        category = request.body.category,
        bounty = request.body.bounty;
    checkUser (user_id, function(check_result) {
        if (check_result == 0) {
            console.log("User does not exist in database.");
            response.sendStatus(400);
            return;
        } else if (check_result < 0) {
            response.send(getPunishmentName(check_result));
            return;
        }
        var date = new Date();
        if (image === "") {image = "nope";}
        if (image2 === "") {image2 = "nope";}
        if (image3 === "") {image3 = "nope";}
        var datestr = date.getUTCFullYear() + "-" + (date.getUTCMonth()+1) + "-" + date.getUTCDate() + " " +
        date.getUTCHours()+ ":" + date.getUTCMinutes() + ":" + date.getUTCSeconds();
        connection.query('SELECT currency FROM users WHERE user_id =' + user_id, function (error3, results3, fields3) {
            if (error3) response.send(error3);
            var curr = results3[0].currency;
            if (curr >= bounty) {
                var diff = curr - bounty;
                console.log(diff);
                var sql2 = "UPDATE users SET currency = \'" + diff + "\' WHERE user_id= " + user_id;
                connection.query(sql2, function (error2, results2, fields2) {
                   if (error2) response.send(error2);
                   connection.query('INSERT INTO posts (user_id, time_created, title, text_content, image, image2, image3, category, bounty) VALUES (\'' +
                       user_id + '\', TIMESTAMP(\'' + datestr + '\'), \'' + escape(title) + '\', \'' + escape(text_content) + '\', \'' + escape(image) +
                       '\', \'' + escape(image2) + '\', \'' + escape(image3) + '\', \'' + category + '\', \'' + bounty + '\')', function (error, results, fields) {
                           if (error) response.send(error);
                           var extraction_result = keyword_extractor.extract((text_content),{ language:"english", remove_digits: true,
                           return_changed_case:true, remove_duplicates: true});
                           //console.log(extraction_result);
                           if (extraction_result.length > 0) {
                               var i;
                               var sql = "INSERT INTO post_keywords (post_id, keyword) VALUES "
                               for (i = 0; i < extraction_result.length; i++) {
                                   sql += "(" + results.insertId + ", \'" + escape(extraction_result[i]) + "\')";
                                   if (i != extraction_result.length-1) {
                                       sql += ", ";
                                   }
                               }
                               connection.query(sql, function (error1, results1, fields1) {
                                   if (error1) throw error1;
                                   var sql = "INSERT INTO user_is_following (user_id, post_id) VALUES (\'"
                                   + user_id + "\', \'"
                                   + results.insertId + "\')";
                                   connection.query(sql, function(error5, result5, fields5) {
                                       if (error5) throw error5;
                                       response.send(results);
                                   });
                               });
                           } else { response.send(results); }
                       });
                });
            } else {
                response.send("Not Enough Currency!");
            }
        });
    });
});

//Search for posts by category
app.get('/post/search', function(request, response) {
    var category = request.query.category;
    var keyword = request.query.keyword;
    var top = request.query.top;
    
    var query = 'SELECT * FROM posts';
    if (category) {
        query += ' WHERE category=\'' + category + '\'' + (keyword ? ' AND ' : '');
    }
    if (keyword) {
        query += (!category ? ' WHERE ' : '') + 'title LIKE \'%' + keyword + '%\'';
    }
    if (top > 0) {
        //Sort by decreasing upvote score
        query += ' ORDER BY (up_votes - down_votes) DESC';
    } else if (top != null) {
        //Sort by increasing upvote score
        query += ' ORDER BY (up_votes - down_votes) ASC';
    }
    connection.query(query, function (error, results, fields) {
        if (error) response.send(error);
        if (keyword) {
            var keyword_query = 'SELECT * FROM posts WHERE '
            + (category ? 'category=\'' + category + '\' AND ' : '')
            + 'post_id in (SELECT post_id FROM post_keywords WHERE keyword LIKE \'%' + keyword + '%\')';
            if (top > 0) {
                //Sort by decreasing upvote score
                keyword_query += ' ORDER BY (up_votes - down_votes) DESC';
            } else if (top != null) {
                //Sort by increasing upvote score
                keyword_query += ' ORDER BY (up_votes - down_votes) ASC';
            }
            connection.query(keyword_query, function (error, keyword_results, fields) {
                if (error) response.send(error);
                //Removes duplicate results
                var filtered = keyword_results.filter(function(item) {
                    for (var check_item in results) {
                        if (results[check_item].post_id == item.post_id) {
                            return false;
                        }
                    }
                    return true;
                });
                var final_results = results.concat(filtered);
                var i = 0;
                for (i = 0; i < final_results.length; i++) {
                    final_results[i].title = unescape(final_results[i].title);
                    final_results[i].text_content = unescape(final_results[i].text_content);
                    final_results[i].image = unescape(final_results[i].image);
                    final_results[i].image2 = unescape(final_results[i].image2);
                    final_results[i].image3 = unescape(final_results[i].image3);
                }
                response.send(reportFilter(final_results));
            });
        } else {
            var i = 0;
            for (i = 0; i < results.length; i++) {
                results[i].title = unescape(results[i].title);
                results[i].text_content = unescape(results[i].text_content);
                results[i].image = unescape(results[i].image);
                results[i].image2 = unescape(results[i].image2);
                results[i].image3 = unescape(results[i].image3);
            }
            response.send(reportFilter(results));
            return;
        }
    });
});

//Get the feed
app.get('/post/feed', function(request, response) {
    var json = request.query;
    if(json.type === 'new') {
        var sql = "SELECT * FROM posts ORDER BY time_created DESC LIMIT 50";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            var i = 0;
            for (i = 0; i < results.length; i++) {
                results[i].title = unescape(results[i].title);
                results[i].text_content = unescape(results[i].text_content);
                results[i].image = unescape(results[i].image);
                results[i].image2 = unescape(results[i].image2);
                results[i].image3 = unescape(results[i].image3);
            }
            response.send(reportFilter(results));
        });
    } else if (json.type === 'top') {
        var sql = "SELECT * FROM posts ORDER BY (up_votes-down_votes)*10 + views DESC LIMIT 50";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            for (i = 0; i < results.length; i++) {
                results[i].title = unescape(results[i].title);
                results[i].text_content = unescape(results[i].text_content);
                results[i].image = unescape(results[i].image);
                results[i].image2 = unescape(results[i].image2);
                results[i].image3 = unescape(results[i].image3);
            }
            response.send(reportFilter(results));
        });
    } else { response.sendStatus(400); }

});

//Get post
app.get('/post/:pid', function(request, response) {
    var postId = request.params.pid;
    if (postId) {
        var sql = "SELECT * FROM posts WHERE post_id=\'" + postId + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            var post = results[0];
            if (post !== undefined) {
                post.title = unescape(post.title);
                post.text_content = unescape(post.text_content);
                post.image = unescape(post.image);
                post.image2 = unescape(post.image2);
                post.image3 = unescape(post.image3);
                response.send(post);
            } else { response.send("Post does not exist"); }
        });
    } else { response.sendStatus(400); }

});

//Edit a post //insert into posts (user_id, time_created, title, text_content, category) values(1, TIMESTAMP('2017-09-09 09:09:09'), 'hello world', 'lots and lots and lots of words', 'other');
app.post('/post/:pid', function(request, response) {
    var postId = request.params.pid;
    var json = request.body;
    if (json.text_content) {
        checkPost(postId, function(post_results) {
            if (post_results == -1) {
                console.log("ERROR: User attempting to edit a post that does not exist!");
                response.sendStatus(400);
                return;
            }
            var sql = "UPDATE posts SET text_content = \'" + escape(json.text_content) +"\' WHERE post_id=\'" + postId + "\'";
            connection.query(sql, function (error, results, fields) {
                if (error) throw error;
                var sql2 = "DELETE FROM post_keywords WHERE post_id=\'" + postId + "\'";
                connection.query(sql2, function (error1, results1, fields1) {
                });
                var extraction_result = keyword_extractor.extract((json.text_content),{ language:"english", remove_digits: true,
                return_changed_case:true, remove_duplicates: true});
                //console.log(extraction_result);
                if (extraction_result.length > 0) {
                    var i;
                    var sql1 = "INSERT INTO post_keywords (post_id, keyword) VALUES "
                    for (i = 0; i < extraction_result.length; i++) {
                        sql1 += "(" + postId + ", \'" + escape(extraction_result[i]) + "\')";
                        if (i != extraction_result.length-1) {
                            sql1 += ", ";
                        }
                    }
                    connection.query(sql1, function (error1, results1, fields1) {
                        if (error1) throw error1;
                        response.send(results);
                    });
                } else { response.send(results); }

            });
        });
    } else { response.sendStatus(400); }
});

//Delete a post
app.delete('/post/:pid', function(request, response) {
    var postId = request.params.pid;
    checkPost(postId, function(post_results) {
        if (post_results == -1) {
            console.log("ERROR: User attempting to delete a post that does not exist!");
            response.sendStatus(400);
            return;
        }
        var sql = "DELETE FROM posts WHERE post_id=\'" + postId + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            response.send(results);
        });
    });
});

//Close a post
app.post('/post/:pid/close', function(request, response) {
    var postId = request.params.pid;
    var json = request.body;
    if (json.reply_id) {
        checkPost(postId, function(post_results) {
            if (post_results == -1) {
                console.log("ERROR: User attempting to close a post that does not exist!");
                response.sendStatus(400);
                return;
            }
            var sql = "UPDATE replies SET is_best_answer = 1 WHERE reply_id=\'" + json.reply_id + "\'";
            connection.query(sql, function (error, results, fields) {
                if (error) throw error;
                var sql1 = "UPDATE posts SET has_best_answer = 1 WHERE post_id=\'" + postId + "\'";
                connection.query(sql1, function (error1, results1, fields1) {
                    if (error1) throw error1;
                    var sql2 = "UPDATE users set currency = currency + (SELECT bounty FROM posts WHERE post_id = " + postId +
                    ") WHERE user_id = (SELECT user_id FROM replies WHERE reply_id = " + json.reply_id + " )";
                    connection.query(sql2, function (error2, results2, fields2) {
                        if (error2) throw error2;
                        response.send(results);
                    });
                });
            });
        });
    } else { response.sendStatus(400); }
});

//Reply to a post
app.post('/post/:pid/reply', function(request, response) {
    var postId = request.params.pid;
    var json = request.body;
    var image = request.body.image1,
        image2 = request.body.image2,
        image3 = request.body.image3;
    if (image === "") {image = "nope";}
    if (image2 === "") {image2 = "nope";}
    if (image3 === "") {image3 = "nope";}
    if (!json.text_content) {
        response.sendStatus(400);
        return;
    }
    checkUser(json.user_id, function(check_result) {
        if (check_result == 0) {
            console.log("User with user_id " + json.user_id + " does not exist!");
            response.sendStatus(400);
            return;
        } else if (check_result < 0) {
            response.send(getPunishmentName(check_result));
            return;
        }
        var sql = "INSERT INTO replies (post_id, user_id, image, image2, image3, text_content) values (\'"
        + postId + "\', \'" + json.user_id +"\', \'" + escape(image) +"\', \'" + escape(image2) +"\', \'" + escape(image3) +
        "\', \'" + escape(json.text_content) + "\')";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            checkPost(postId, function(post_results) {
                if (post_results == -1) {
                    console.log("ERROR: User attempting to reply to a post that does not exist!");
                    response.sendStatus(400);
                    return;
                }
                var sql2 = "SELECT device_id, title FROM user_is_following INNER JOIN users ON user_is_following.user_id = " +
                "users.user_id INNER JOIN posts ON posts.post_id = user_is_following.post_id WHERE user_is_following.post_id=" + postId +
                " AND users.user_id != " + json.user_id;
                connection.query(sql2, function (error1, results1, fields1) {
                    if (error1) throw error1;
                    var device_ids = [];
                    var title = "";
                    var body = "";
                    for (var x in results1) {
                        if (results1[x].device_id) {
                            device_ids.push(results1[x].device_id)
                            title = "Notification on post you follow";
                            body = "Someone posted a reply on the post \"" + unescape(results1[x].title) + "\" that you follow";
                        }
                    }
                    if (device_ids.length > 0) {
                        createNotification(device_ids, title, body);
                    }
                    response.send(results);
                });
            });
        });
    });
});

//Vote on a post
app.post('/post/:pid/vote', function(request, response) {
    var postId = request.params.pid;
    var json = request.body;
    if (!json.vote) {
        response.sendStatus(400);
        return;
    }
    checkUser (json.user_id, function(check_result) {
        if (check_result == 0) {
            console.log("User with user_id " + json.user_id + " does not exist!");
            response.sendStatus(400);
            return;
        } else if (check_result < -1) {
            response.send(getPunishmentName(check_result));
            return;
        }
        checkPost(postId, function(post_results) {
            if (post_results == -1) {
                console.log("ERROR: User attempting to vote on a post that does not exist!");
                response.sendStatus(400);
                return;
            }
            json.vote = (json.vote > 0 ? 1 : -1);
            var query = 'SELECT * FROM user_votes_post WHERE user_id=\'' + json.user_id + '\' AND post_id=\'' + postId + '\'';
            connection.query(query, function(error, results, fields) {
                if (error) throw error;
                var vote_query = '';
                if (results.length > 0) {
                    //Entry already exists
                    console.log("Found existing post vote entry");
                    if (results[0].vote == json.vote) {
                        response.send(null);
                        return;
                    }
                    vote_query = 'UPDATE user_votes_post SET vote=\'' + json.vote 
                        + '\' WHERE user_id=\'' + json.user_id
                        + '\' AND post_id=\'' + postId + '\'';
                } else {
                    //Entry does not exist
                    console.log("Did not find existing post vote entry");
                    vote_query = 'INSERT INTO user_votes_post (user_id, post_id, vote) VALUES (\'' 
                        + json.user_id + '\', \'' 
                        + postId + '\', \''
                        + json.vote + '\')';
                }
                connection.query(vote_query, function(error, vote_results, fields) {
                    if (error) throw error;
                    var post_update_query = '';
                    if (results.length > 0) {
                        post_update_query = 'UPDATE posts SET up_votes = up_votes + ' + json.vote 
                            + ', down_votes = down_votes - ' + json.vote + ' WHERE post_id=\'' + postId + '\'';
                    } else {
                        if (json.vote > 0) {
                            post_update_query = 'UPDATE posts SET up_votes = up_votes + 1 WHERE post_id=\'' + postId + '\'';
                        } else {
                            post_update_query = 'UPDATE posts SET down_votes = down_votes + 1 WHERE post_id=\'' + postId + '\'';
                        }
                    }
                    connection.query(post_update_query, function(error, update_results, fields) {
                        if (error) throw error;
                        response.send(update_results);
                    });
                });
            });
        });
    });
});

//Follow a post
app.post('/post/:pid/follow', function(request, response) {
    var postId = request.params.pid;
    var json = request.body;
    checkUser (json.user_id, function(check_result) {
        if (check_result == 0) {
            console.log("User does not exist in database.");
            response.sendStatus(400);
            return;
        } else if (check_result < -1) {
            response.send(getPunishmentName(check_result));
            return;
        }
        checkPost (postId, function(post_check) {
            if (post_check != 0) {
                console.log("Post " + postId + " does not exist in database!")
                response.sendStatus(400);
                return;
            }
            //Both user_id and postId exist
            
            //Check if an entry exists already
            var query = "SELECT * FROM user_is_following WHERE user_id = \'" + json.user_id + "\' AND post_id = \'" + postId + "\'";
            connection.query(query, function(error, exist_results, fields) {
                if (error) throw error;
                if (exist_results.length > 0) {
                    console.log("User with user_id " + json.user_id + " is already following post with post_id " + postId + "!");
                    response.sendStatus(400);
                    return;
                }
                
                var sql = "INSERT INTO user_is_following (user_id, post_id) VALUES (\'"
                + json.user_id + "\', \'"
                + postId + "\')";
                connection.query(sql, function(error, result, fields) {
                    if (error) throw error;
                    response.send(result);
                }); 
            });
        });
    });
});

//Unfollow a post
app.post('/post/:pid/unfollow', function(request, response) {
    var postId = request.params.pid;
    var json = request.body;
    checkUser (json.user_id, function(check_result) {
        if (check_result == 0) {
            console.log("User does not exist in database.");
            response.sendStatus(400);
            return;
        } else if (check_result < -1) {
            response.send(getPunishmentName(check_result));
            return;
        }
        checkPost (postId, function(post_check) {
            if (post_check != 0) {
                console.log("Post " + postId + " does not exist in database!")
                response.sendStatus(400);
                return;
            }
            //Both user_id and postId exist
            var sql = "DELETE FROM user_is_following WHERE user_id = \'" + json.user_id + "\' AND post_id = \'" + postId + "\'";
            connection.query(sql, function(error, result, fields) {
                if (error) throw error;
                response.send(result);
            });
        });
    });
});

//Gets posts that are followed by a specific user
app.get('/post/userfollowed/:uid', function(request, response) {
    var user_id = request.params.uid;
    checkUser(user_id, function(check_result) {
        if (check_result == 0) {
            console.log("User with user_id " + user_id + " does not exist!");
            response.sendStatus(400);
            return;
        }
        var query = "SELECT * FROM posts WHERE post_id IN (SELECT post_id FROM user_is_following WHERE user_id = \'" + user_id + "\')";
        connection.query(query, function(error, results, fields) {
            if (error) throw error;
            response.send(reportFilter(results));
        });
    });
});

//Report a post
app.post('/post/:pid/report', function(request, response) {
    var postId = request.params.pid;
    var json = request.body;
    checkUser (json.user_id, function(check_result) {
        if (check_result == 0) {
            console.log("User with user_id " + json.user_id + " does not exist!");
            response.sendStatus(400);
            return;
        } else if (check_result < 0) {
            response.send(getPunishmentName(check_result));
            return;
        }
        checkPost(postId, function(post_results) {
            if (post_results == -1) {
                console.log("ERROR: User attempting to report a post that does not exist!");
                response.sendStatus(400);
                return;
            }
            var check_query = "SELECT * FROM posts WHERE post_id=\'" + postId + "\'";
            connection.query(check_query, function(error, check_results, fields) {
                if (error) throw error;
                if (check_results.length <= 0) {
                    console.log("Post does not exist in database!");
                    response.sendStatus(400);
                    return;
                }
                var query = "SELECT * FROM reported_posts WHERE post_id=\'" + postId + "\' AND user_id=\'" + json.user_id + "\'";
                connection.query(query, function (error, results, fields) {
                    if (error) throw error;
                    if (results.length > 0) {
                        console.log("User has already reported this post!");
                        response.sendStatus(400);
                        return;
                    }
                    var insert_query = "INSERT INTO reported_posts (post_id, user_id, report_code) VALUES (\'"
                        + postId + "\', \'"
                        + json.user_id + "\', \'"
                        + json.report_code + "\')";
                    connection.query(insert_query, function(error, insert_results, fields) {
                        if (error) throw error;
                        //Check if post should be hidden for review by administration
                        var check_num_query = "SELECT * FROM reported_posts WHERE post_id=\'" + postId + "\'";
                        connection.query(check_num_query, function(error, check_num_results, fields) {
                            if (check_num_results.length >= post_report_threshold) {
                                //Hide the post for review
                                var hide_query = "UPDATE posts SET hide_for_reporting = CASE\nWHEN hide_for_reporting = 2 THEN 2\nELSE 1\nEND WHERE  post_id=\'" + postId + "\'";
                                connection.query(hide_query, function(error, hide_results, fields) {
                                    if (error) throw error;
                                    response.send(hide_results);
                                    return;
                                });
                            } else {
                                response.send(insert_results);
                            }
                        });
                    });
                });
            });
        });
    });
});

//Get all post replies - Requires user_id
app.get('/post/:pid/reply/all', function(request, response) {
    var postid = request.params.pid;
    var userid = request.query.user_id;
    var top = request.query.top;
    checkUser (userid, function(check_result) {
        if (check_result == 0) {
            console.log("User with user_id " + userid + " does not exist!");
            response.sendStatus(400);
            return;
        } else if (check_result < -1) {
            response.send(getPunishmentName(check_result));
            return;
        }
        checkPost(postid, function(post_results) {
            if (post_results == -1) {
                console.log("ERROR: User attempting to get replies of a post that does not exist!");
                response.sendStatus(400);
                return;
            }
            var sql = "SELECT reply_id, post_id, replies.user_id, text_content, image, image2, image3, is_best_answer, up_votes, down_votes," +
            " username, is_featured FROM replies INNER JOIN users ON replies.user_id=users.user_id WHERE CASE WHEN ((SELECT user_id FROM" +
            " posts WHERE post_id =" + postid + ") =" + userid + ") THEN post_id =" + postid + " AND is_hidden = 0 ELSE post_id = "+ postid +" END";
            if (top > 0) {
                sql += " ORDER BY (replies.up_votes - replies.down_votes) DESC";
            } else if (top != null) {
                sql += " ORDER BY (replies.up_votes - replies.down_votes) ASC";
            }
            connection.query(sql, function (error, results, fields) {
                if (error) throw error;
                var i = 0;
                for (i = 0; i < results.length; i++) {
                    results[i].text_content = unescape(results[i].text_content);
                    results[i].image = unescape(results[i].image);
                    results[i].image2 = unescape(results[i].image2);
                    results[i].image3 = unescape(results[i].image3);
                }
                response.send(prioritizeFeatured(reportFilter(results)));
            });
        });
    });
});

//Get a specific reply to a post
app.get('/post/:pid/reply/:rid', function(request, response) {
    var postId = request.params.pid;
    var replyId = request.params.rid;
    checkPostAndReply(postId, replyId, function(check_results) {
        if (check_results == -1) {
            console.log("ERROR: User attempting to get a reply that does not exist or does not match post!");
            response.sendStatus(400);
            return;
        }
        var sql = "SELECT * FROM replies WHERE reply_id=\'" + replyId + "\'";
        connection.query(sql, function(error, results, fields) {
            if (error) throw error;
            results.text_content = unescape(results.text_content);
            results.image = unescape(results.image);
            results.image2 = unescape(results.image2);
            results.image3 = unescape(results.image3);
            response.send(reportFilter(results));
        });
    });
});

//Delete a reply
app.delete('/post/:pid/reply/:rid', function(request, response) {
    var postId = request.params.pid;
    var replyId = request.params.rid;
    checkPostAndReply(postId, replyId, function(check_results) {
        if (check_results == -1) {
            console.log("ERROR: User attempting to delete a reply that does not exist or does not match post!");
            response.sendStatus(400);
            return;
        }
        var sql = "DELETE FROM replies WHERE post_id=\'" + postId + "\' AND reply_id=\'" + replyId + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            response.send(results);
        });
    });
});

//Vote on a reply to a post
app.post('/post/:pid/reply/:rid/vote', function(request, response) {
    var postId = request.params.pid;
    var replyId = request.params.rid;
    var json = request.body;
    if (!postId || !replyId || !json.vote) {
        response.sendStatus(400);
        return;
    }
    checkUser (json.user_id, function(check_result) {
        if (check_result == 0) {
            console.log("User with user_id " + json.user_id + " does not exist!");
            response.sendStatus(400);
            return;
        } else if (check_result < -1) {
            response.send(getPunishmentName(check_result));
            return;
        }
        checkPostAndReply(postId, replyId, function(check_results) {
            if (check_results == -1) {
                console.log("ERROR: User attempting to vote on a reply that does not exist or does not match post!");
                response.sendStatus(400);
                return;
            }
            json.vote = (json.vote > 0 ? 1 : -1);
            var query = 'SELECT * FROM user_votes_reply WHERE user_id=\'' + json.user_id + '\' AND reply_id=\'' + replyId + '\'';
            connection.query(query, function(error, results, fields) {
                if (error) throw error;
                var vote_query = '';
                if (results.length > 0) {
                    //Entry already exists
                    console.log("Found existing reply vote entry");
                    if (results[0].vote == json.vote) {
                        response.sendStatus(400);
                        return;
                    }
                    vote_query = 'UPDATE user_votes_reply SET vote=\'' + json.vote 
                        + '\' WHERE user_id=\'' + json.user_id
                        + '\' AND reply_id=\'' + replyId + '\'';
                } else {
                    //Entry does not exist
                    console.log("Did not find existing reply vote entry");
                    vote_query = 'INSERT INTO user_votes_reply (user_id, reply_id, vote) VALUES (\'' 
                        + json.user_id + '\', \'' 
                        + replyId + '\', \''
                        + json.vote + '\')';
                }
                connection.query(vote_query, function(error, vote_results, fields) {
                    if (error) throw error;
                    var reply_update_query = '';
                    if (results.length > 0) {
                        reply_update_query = 'UPDATE replies SET up_votes = up_votes + ' + json.vote 
                            + ', down_votes = down_votes - ' + json.vote + ' WHERE reply_id=\'' + replyId + '\'';
                    } else {
                        if (json.vote > 0) {
                            reply_update_query = 'UPDATE replies SET up_votes = up_votes + 1 WHERE reply_id=\'' + replyId + '\'';
                        } else {
                            reply_update_query = 'UPDATE replies SET down_votes = down_votes + 1 WHERE reply_id=\'' + replyId + '\'';
                        }
                    }
                    connection.query(reply_update_query, function(error, update_results, fields) {
                        if (error) throw error;
                        response.send(update_results);
                    });
                });
            });
        });
    });
});

//Hide a reply to a post
app.post('/post/:pid/reply/:rid/hide', function(request, response) {
    var postId = request.params.pid;
    var replyId = request.params.rid;
    checkPostAndReply(postId, replyId, function(check_results) {
        if (check_results == -1) {
            console.log("ERROR: User is attempting to hide a reply that does not exist or does not match the post!");
            response.sendStatus(400);
            return;
        }
        var sql = "UPDATE replies SET is_hidden = 1 WHERE reply_id=\'" + replyId + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            response.send(results);
        });
    });
});

//Report a reply to a post
app.post('/post/:pid/reply/:rid/report', function(request, response) {
    var postId = request.params.pid;
    var replyId = request.params.rid;
    var json = request.body;
    if (!postId || !replyId) {
        reponse.sendStatus(400);
        return;
    } 
    checkUser (json.user_id, function(check_result) {
        if (check_result == 0) {
            console.log("User with user_id " + json.user_id + " does not exist!");
            response.sendStatus(400);
            return;
        } else if (check_result < 0) {
            response.send(getPunishmentName(check_result));
            return;
        }
        checkPostAndReply(postId, replyId, function(check_results) {
            if (check_results == -1) {
                console.log("ERROR: User attempting to report a reply that does not exist or does not match the post!");
                response.sendStatus(400);
                return;
            }
            var check_query = "SELECT * FROM replies WHERE reply_id=\'" + replyId + "\'";
            connection.query(check_query, function(error, check_results, fields) {
                if (check_results.length <= 0) {
                    console.log("Reply does not exist in database!");
                    response.sendStatus(400);
                    return;
                }
                var query = "SELECT * FROM reported_replies WHERE reply_id=\'" + replyId + "\' AND user_id=\'" + json.user_id + "\'";
                connection.query(query, function (error, results, fields) {
                    if (error) throw error;
                    if (results.length > 0) {
                        console.log("User has already reported this reply!");
                        response.sendStatus(400);
                        return;
                    }
                    var insert_query = "INSERT INTO reported_replies (reply_id, user_id, report_code) VALUES (\'"
                        + replyId + "\', \'"
                        + json.user_id + "\', \'"
                        + json.report_code + "\')";
                    connection.query(insert_query, function(error, insert_results, fields) {
                        if (error) throw error;

                        //Check if reply should be hidden for review by administration
                        var check_num_query = "SELECT * FROM reported_replies WHERE reply_id=\'" + replyId + "\'";
                        connection.query(check_num_query, function(error, check_num_results, fields) {
                            if (check_num_results.length >= reply_report_threshold) {
                                //Hide the reply for review
                                var hide_query = "UPDATE replies SET hide_for_reporting = CASE WHEN hide_for_reporting = 2 THEN 2 ELSE 1 END WHERE reply_id=\'" + replyId + "\'";
                                connection.query(hide_query, function(error, hide_results, fields) {
                                    if (error) throw error;
                                    response.send(hide_results);
                                    return;
                                });
                            } else {
                                response.send(insert_results);
                            }
                        });
                    });
                });
            });
        });
    });
});

//Admin feature a reply
app.post('/admin/reply/:rid/feature', function(request, response) {
    var replyId = request.params.rid;
    var userId = request.body.user_id;
    checkUser(userId, function(admin_results) {
        if (admin_results != 2) {
            console.log("ERROR: User attempting to feature a reply does not exist or is not an admin!");
            response.sendStatus(400);
            return;
        }
        checkReply(replyId, function(reply_results) {
            if (reply_results == -1) {
                console.log("ERROR: Admin attempting to feature a reply that does not exist!");
                response.sendStatus(400);
                return;
            }
            var sql = "UPDATE replies SET is_featured = 1 WHERE reply_id = \'" + replyId + "\'";
            connection.query(sql, function(error, results, field) {
                if (error) throw error;
                response.send(results);
            });
        });
    });
});

//Admin unfeature a reply
app.post('/admin/reply/:rid/unfeature', function(request, response) {
    var replyId = request.params.rid;
    var userId = request.body.user_id;
    checkUser(userId, function(admin_results) {
        if (admin_results != 2) {
            console.log("ERROR: User attempting to feature a reply does not exist or is not an admin!");
            response.sendStatus(400);
            return;
        }
        checkReply(replyId, function(reply_results) {
            if (reply_results == -1) {
                console.log("ERROR: Admin attempting to feature a reply that does not exist!");
                response.sendStatus(400);
                return;
            }
            var sql = "UPDATE replies SET is_featured = 0 WHERE reply_id = \'" + replyId + "\'";
            connection.query(sql, function(error, results, field) {
                if (error) throw error;
                response.send(results);
            });
        });
    });
});

//Admin delete a post
app.delete('/admin/post/:pid', function(request, response) {
    var postId = request.params.pid;
    var userId = request.body.user_id;
    checkUser(userId, function (admin_results) {
        if (admin_results != 2) {
            console.log("ERROR: User attempting to delete a post is not an admin!");
            response.sendStatus(400);
            return;
        }
        checkPost(postId, function(post_results) {
            if (post_results == -1) {
                console.log("ERROR: Admin user attempted to delete a post that does not exist!");
                response.sendStatus(400);
                return;
            }
            var sql = "DELETE FROM posts WHERE post_id=\'" + postId + "\'";
            connection.query(sql, function(error, results, field) {
                if (error) throw error;
                response.send(results);
            });
        });
    });
});

//Admin delete a reply to a post
app.delete('/admin/post/:pid/reply/:rid', function(request, response) {
    var postId = request.params.pid;
    var replyId = request.params.rid;
    var userId = request.body.user_id;
    if (!postId || !replyId) {
        response.sendStatus(400);
        return;
    }
    checkUser(userId, function (admin_results) {
        if (admin_results != 2) {
            response.sendStatus(400);
            return;
        }
        checkPostAndReply(postId, replyId, function(check_results) {
            if (check_results == -1) {
                console.log("ERROR: Admin attempting to delete a reply that does not exist or does not match the post!");
            }
            var sql = "DELETE FROM replies WHERE post_id=\'" + postId + "\' AND reply_id=\'" + replyId + "\'";
            connection.query(sql, function(error, results, field) {
                if (error) throw error;
                response.send(results);
            });
        });
    });
});

//Admin get posts that have been reported - Requires user_id
app.get('/admin/post/reported', function(request, response) {
    var userId = request.query.user_id;
    checkUser(userId, function (admin_result) {
        if (admin_result != 2) {
            response.sendStatus(400);
            return;
        }
        var sql = "SELECT * FROM posts WHERE hide_for_reporting=1";
        connection.query(sql, function(error, results, fields) {
            if (error) throw error;
            for (i = 0; i < results.length; i++) {
                results[i].title = unescape(results[i].title);
                results[i].text_content = unescape(results[i].text_content);
                results[i].image = unescape(results[i].image);
                results[i].image2 = unescape(results[i].image2);
                results[i].image3 = unescape(results[i].image3);
            }
            response.send(results);
        });
    });
});

//Admin get replies of a post that have been reported - Requires user_id
app.get('/admin/post/:pid/reply/reported', function(request, response) {
    var postId = request.params.pid;
    var userId = request.query.user_id;
    checkUser(userId, function (admin_result) {
        if (admin_result != 2) {
            response.sendStatus(400);
            return;
        }
        var sql = "SELECT * FROM replies WHERE post_id=\'" + postId + "\' AND hide_for_reporting=1";
        connection.query(sql, function(error, results, fields) {
            if (error) throw error;
            for (i = 0; i < results.length; i++) {
                results[i].title = unescape(results[i].title);
                results[i].text_content = unescape(results[i].text_content);
                results[i].image = unescape(results[i].image);
                results[i].image2 = unescape(results[i].image2);
                results[i].image3 = unescape(results[i].image3);
            }
            response.send(results);
        });
    });
});

//Admin publicly unhides a post that was hidden due to reaching the report limit
app.post('/admin/post/:pid/unhide', function(request, response) {
    var postId = request.params.pid;
    var userId = request.body.user_id;
    if (!postId) {
        response.sendStatus(400);
        return;
    }
    checkUser(userId, function (admin_result) {
        if (admin_result != 2) {
            response.sendStatus(400);
            return;
        }
        checkPost(postId, function (post_results) {
            if (post_results == -1) {
                console.log("ERROR: Admin attempting to unhide a post that does not exist!");
                response.sendStatus(400);
                return;
            }
            var sql = "SELECT * FROM posts WHERE post_id=\'" + postId + "\' AND hide_for_reporting=1";
            connection.query(sql, function(error, results, fields) {
                if (error) throw error;
                if (results.length == 0) {
                    console.log("ERROR: Admin attempting to unhide a post that is not hidden!");
                    response.sendStatus(400);
                    return;
                }
                var query = "UPDATE posts SET hide_for_reporting = 2 WHERE post_id=\'" + postId + "\'";
                connection.query(query, function(error, update_results, fields) {
                    if (error) throw error;
                    response.send(update_results);
                });
            });
        });
    });
});

//Admin publicly unhides a reply that was hidden due to reaching the report limit
app.post('/admin/reply/:rid/unhide', function(request, response) {
    var replyId = request.params.rid;
    var userId = request.body.user_id;
    if (!replyId) {
        response.sendStatus(400);
        return;
    }
    checkUser(userId, function (admin_results) {
        if (admin_results != 2) {
            response.sendStatus(400);
            return;
        }
        checkReply(replyId, function(reply_results) {
            if (reply_results == -1) {
                console.log("ERROR: Admin is attempting to unhide a reply that does not exist!");
                response.sendStatus(400);
                return;
            }
            var sql = "SELECT * FROM replies WHERE reply_id=\'" + replyId + "\' AND hide_for_reporting=1";
            connection.query(sql, function(error, results, fields) {
                if (error) throw error;
                if (results.length == 0) {
                    console.log("ERROR: Admin is attempting to unhide a reply that has not yet been hidden!");
                    response.sendStatus(400);
                    return;
                }
                var query = "UPDATE replies SET hide_for_reporting = 2 WHERE reply_id=\'" + replyId + "\'";
                connection.query(query, function(error, update_results, fields) {
                    if (error) throw error;
                    response.send(update_results);
                });
            });
        });
    });
});

//Admin mute, suspend, or ban a user (or unmute, unsuspend, or unban a user)
app.post('/admin/user/:uid/punish', function(request, response) {
    var uid = request.params.uid;
    var userId = request.body.user_id;
    var punishMode = request.body.punish_mode;
    console.log("\nUser " + userId + " is attempting to punsish user " + uid + " to level " + punishMode + "!\n");
    //Mode 0 == No punishment
    //Mode 1 == Muted
    //Mode 2 == Suspended
    //Mode 3 == Banned
    checkUser(userId, function (admin_results) {
        if (admin_results != 2) {
            console.log("ERROR: User is not an admin or does not exist!");
            response.sendStatus(400);
            return;
        }
        checkUser(uid, function (user_results) {
            if (user_results == 0) {
                response.sendStatus(400);
                console.log("ERROR: User to punish does not exist!");
                return;
            } else if (user_results == 2) {
                response.sendStatus(400);
                console.log("ERROR: User to punish is an admin!");
                return;
            }
            var query = "UPDATE users SET punishment = \'" + punishMode + "\' WHERE user_id = \'" + uid + "\'";
            connection.query(query, function(error, results, fields) {
                if (error) throw error;
                response.send(results);
            });
        });
    });
});

//Send a message to a user (mid)
app.post('/user/:uid/message/:mid', function(request, response) {
    
});

//Get all messages
app.get('/user/:uid/messages', function(request, response) {
    
});

//Helper function that checks if the user with the given user_id exists or is an admin
function checkUser(user_id, callback) {
    var sql = "SELECT * FROM users WHERE user_id=\'" + user_id + "\'";
    connection.query(sql, function(error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            if (results[0]["punishment"] != 0) {
                callback(-results[0]["punishment"]);
            } else {
                if (results[0]["is_admin"] == 1) {
                    callback(2);
                } else {
                    callback(1);
                }
            }
        } else {
            callback(0);
        }
    });
}

//Checks if user exists and sends currency amount to callback
function checkUserCurrency(user_id, callback) {
    if (!user_id) {
        callback(0);
        return;
    }
    checkUser(user_id, function(check) {
        if (check == 0) {
            callback(-1);
        }
        var sql = "SELECT currency FROM users WHERE user_id=\'" + user_id + "\'";
        connection.query(sql, function(error, results, fields) {
            if (error) throw error;
            callback(results[0].currency);
        });
    });
}

function createNotification(device_ids, title, body) {
    console.log("DeviceIDs: " + device_ids + "\nTitle: " + title + "\nBody: " + body);
    // These registration tokens come from the client FCM SDKs.

    // See the "Defining the message payload" section below for details
    // on how to define a message payload.
    var payload = {
      notification: {
        title: title,
        body: body
      }
    };

    // Send a message to the devices corresponding to the provided
    // registration tokens.
    admin.messaging().sendToDevice(device_ids, payload)
      .then(function(response) {
        // See the MessagingDevicesResponse reference documentation for
        // the contents of response.
        console.log("Successfully sent message:", response);
      })
      .catch(function(error) {
        console.log("Error sending message:", error);
      });

}

//Helper function that checks if the post with the given post_id exists
function checkPost(post_id, callback) {
    if (!post_id) {
        callback(-1);
        return;
    }
    var sql = "SELECT * FROM posts WHERE post_id=\'" + post_id + "\'";
    connection.query(sql, function(error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            callback(0);
            return;
        }
        callback(-1);
        return;
    });
}

//Helper function that checks if the reply with the given reply_id exists
function checkReply(reply_id, callback) {
    if (!reply_id) {
        callback(-1);
        return;
    }
    var sql = "SELECT * FROM replies WHERE reply_id=\'" + reply_id + "\'";
    connection.query(sql, function(error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            callback(0);
            return;
        }
        callback(-1);
        return;
    });
}

//Helper function that checks that both reply and post id's exist and that they belong together
function checkPostAndReply(post_id, reply_id, callback) {
    if (!post_id || !reply_id) {
        callback(-1);
        return;
    }
    var sql = "SELECT * FROM replies WHERE post_id=\'" + post_id + "\' AND reply_id=\'" + reply_id + "\'";
    connection.query(sql, function(error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            callback(0);
            return;
        }
        callback(-1);
        return;
    });
}

//Helper function to get punishment name
function getPunishmentName(num) {
    switch (num) {
        case -1:
            return "muted";
            break;
        case -2:
            return "suspended";
            break;
        case -3:
            return "banned";
            break;
        default:
            return "none";
            break;
    }
}

//Helper function to remove reported posts from sql results
function reportFilter(input) {
    var filtered = input.filter(function(item) {
        return item.hide_for_reporting !== 1; 
    });
    return filtered;
}

//Helper function to prioritize featured replies to a post
function prioritizeFeatured(input) {
    var featured = input.filter(function(item) {
        return item.is_featured == 1;
    });
    var nonfeatured = input.filter(function(item) {
        return item.is_featured == 0; 
    });
    return featured.concat(nonfeatured);
}

//Helper function to exchange "amt" currency from user 1 to user 2
function exchangeCurrency(user1, user2, amt, callback) {
    checkUserCurrency (user1, function(check_results) {
        if (check_results < 0) {
            console.log("User with user_id " + user1 + " does not exist!");
            return callback(-1);
        } else if (check_results < amt) {
            console.log("User with user_id " + user1 + " does not have enough currency for that transaction!");
            return callback(-1);
        }
        //User 1 exists and has enough currency for transaction
        checkUser(user2, function(check_results2) {
            if (check_results2 == 0) {
                console.log("User with user_id " + user2 + " does not exist!");
                return callback(-1);
            }
            //Both users are active
            var sql = "UPDATE users SET currency = currency - " + amt + " WHERE user_id = \'" + user1 + "\'";
            connection.query(sql, function(error, results, fields) {
                if (error) throw error;
                var sql = "UPDATE users SET currency = currency + " + amt + " WHERE user_id = \'" + user2 + "\'";
                connection.query(sql, function(error, results, fields) {
                    if (error) throw error;
                    return callback(0);
                });
            });
        });
    });
}

//===== PORT =====//
var port = process.env.PORT || 5000;
app.listen(port);
console.log("Cyrano server started at :" + port);
