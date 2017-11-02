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

var post_report_threshold = 3;
var reply_report_threshold = 3;


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
        response.send(reportFilter(results));
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
    var date = new Date();
    if (image === "") {image = "nope";}
    if (image2 === "") {image2 = "nope";}
    if (image3 === "") {image3 = "nope";}
    var datestr = date.getUTCFullYear() + "-" + (date.getUTCMonth()+1) + "-" + date.getUTCDate() + " " +
    date.getUTCHours()+ ":" + date.getUTCMinutes() + ":" + date.getUTCSeconds();
    connection.query('INSERT INTO posts (user_id, time_created, title, text_content, image, image2, image3, category, bounty) VALUES (\'' +
    user_id + '\', TIMESTAMP(\'' + datestr + '\'), \'' + escape(title) + '\', \'' + escape(text_content) + '\', \'' + escape(image) +
    '\', \'' + escape(image2) + '\', \'' + escape(image3) + '\', \'' + category + '\', \'' + bounty + '\')', function (error, results, fields) {
        if (error) response.send(error);
        var extraction_result = keyword_extractor.extract((text_content),{ language:"english", remove_digits: true,
        return_changed_case:true, remove_duplicates: true});
        console.log(extraction_result);
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
                response.send(results);
            });
        } else { response.send(results); }
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
    console.log(query);
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
            console.log(keyword_query);
            connection.query(keyword_query, function (error, keyword_results, fields) {
                if (error) response.send(error);
                var final_results = results.concat(keyword_results);
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
            var post = reportFilter(results)[0];
            if (post !== undefined) {
                post.title = unescape(post.title);
                post.text_content = unescape(post.text_content);
                post.image = unescape(post.image);
                post.image2 = unescape(post.image2);
                post.image3 = unescape(post.image3);
                response.send(post);
            } else { response.send("Post does not exist");}
        });
    } else { response.sendStatus(400); }

});

//Edit a post //insert into posts (user_id, time_created, title, text_content, category) values(1, TIMESTAMP('2017-09-09 09:09:09'), 'hello world', 'lots and lots and lots of words', 'other');
app.post('/post/:pid', function(request, response) {
    var postId = request.params.pid;
    var json = request.body;
    if (postId && json.text_content) {
        var sql = "UPDATE posts SET text_content = \'" + escape(json.text_content) +"\' WHERE post_id=\'" + postId + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            var sql2 = "DELETE FROM post_keywords WHERE post_id=\'" + postId + "\'";
            connection.query(sql2, function (error1, results1, fields1) {
            });
            var extraction_result = keyword_extractor.extract((json.text_content),{ language:"english", remove_digits: true,
            return_changed_case:true, remove_duplicates: true});
            console.log(extraction_result);
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
    var postId = request.params.pid;
    var json = request.body;
    var image = request.body.image1,
        image2 = request.body.image2,
        image3 = request.body.image3;
    if (image === "") {image = "nope";}
    if (image2 === "") {image2 = "nope";}
    if (image3 === "") {image3 = "nope";}
    if (!postId || !json.text_content) {
        response.sendStatus(400);
        return;
    }
    checkUser(json.user_id, function(check_result) {
        if (check_result == 0) {
            console.log("User with user_id " + json.user_id + " does not exist!");
            response.sendStatus(400);
            return;
        }
        var sql = "INSERT INTO replies (post_id, user_id, image, image2, image3, text_content) values (\'"
        + postId + "\', \'" + json.user_id +"\', \'" + escape(image) +"\', \'" + escape(image2) +"\', \'" + escape(image3) +
        "\', \'" + escape(json.text_content) + "\')";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            response.send(results);
        });
    });
});

//Vote on a post
app.post('/post/:pid/vote', function(request, response) {
    var postId = request.params.pid;
    var json = request.body;
    if (!postId || !json.vote) {
        response.sendStatus(400);
        return;
    }
    checkUser (json.user_id, function(check_result) {
        if (check_result == 0) {
            console.log("User with user_id " + json.user_id + " does not exist!");
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
                    response.sendStatus(400);
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

//Report a post
app.post('/post/:pid/report', function(request, response) {
    var postId = request.params.pid;
    var json = request.body;
    if (!postId) {
        response.sendStatus(400);
        return;
    }
    checkUser (json.user_id, function(check_result) {
        if (check_result == 0) {
            console.log("User with user_id " + json.user_id + " does not exist!");
            response.sendStatus(400);
            return;
        }
        var check_query = "SELECT * FROM posts WHERE post_id=\'" + postId + "\'";
        connection.query(check_query, function(error, check_results, fields) {
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

//Get all post replies - Requires user_id
app.get('/post/:pid/reply/all', function(request, response) {
    var postid = request.params.pid;
    var userid = request.query.user_id;
    var top = request.query.top;
    if (!postid) {
        response.sendStatus(400);
        return;
    }
    checkUser (userid, function(check_result) {
        if (check_result == 0) {
            console.log("User with user_id " + userid + " does not exist!");
            response.sendStatus(400);
            return;
        }
        var sql = "SELECT reply_id, post_id, replies.user_id, text_content, image, image2, image3, is_best_answer, up_votes, down_votes," +
        " username FROM replies INNER JOIN users ON replies.user_id=users.user_id WHERE CASE WHEN ((SELECT user_id FROM" +
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
            response.send(results);
        });
    });
});

//Get a specific reply to a post
app.get('/post/:pid/reply/:rid', function(request, response) {
    var postId = request.params.pid;
    var replyId = request.params.rid;
    if (replyId) {
        var sql = "SELECT * FROM replies WHERE reply_id=\'" + replyId + "\'";
        connection.query(sql, function(error, results, fields) {
            if (error) throw error;
            results.text_content = unescape(results.text_content);
            results.image = unescape(results.image);
            results.image2 = unescape(results.image2);
            results.image3 = unescape(results.image3);
            response.send(results);
        });
    } else { response.sendStatus(400); }
});

//Delete a reply
app.delete('/post/:pid/reply/:rid', function(request, response) {
    var postId = request.params.pid;
    var replyId = request.params.rid;
    if (postId) {
        var sql = "DELETE FROM replies WHERE post_id=\'" + postId + "\' AND reply_id=\'" + replyId + "\'";
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            response.send(results);
        });
    } else { response.sendStatus(400); }
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

//Hide a reply to a post
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
        if (checkResult == 0) {
            console.log("User with user_id " + json.user_id + " does not exist!");
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

//Admin delete a post
app.delete('/admin/post/:pid', function(request, response) {
    var postId = request.params.pid;
    var userId = request.body.user_id;
    if (!postId) {
        response.sendStatus(400);
        return;
    }
    checkUser(userId, function (admin_results) {
        if (admin_results != 2) {
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
        var sql = "DELETE FROM replies WHERE post_id=\'" + postId + "\' AND reply_id=\'" + replyId + "\'";
        connection.query(sql, function(error, results, field) {
            if (error) throw error;
            response.send(results);
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
        var sql = "SELECT * FROM posts WHERE post_id=\'" + postId + "\' AND hide_for_reporting=1";
        connection.query(sql, function(error, results, fields) {
            if (error) throw error;
            if (results.length == 0) {
                console.log("Post with this post id is not hidden for reporting or does not exist!");
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
        var sql = "SELECT * FROM replies WHERE reply_id=\'" + replyId + "\' AND hide_for_reporting=1";
        connection.query(sql, function(error, results, fields) {
            if (error) throw error;
            if (results.length == 0) {
                console.log("Reply with this reply id is not hidden for reporting or does not exist!");
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

//Send a message to a user (mid)
app.post('/user/:uid/message/:mid', function(request, response) {
    
});

//Get all messages
app.get('/user/:uid/messages', function(request, response) {
    
});

//Helper function that checks if the user with the given user_id is an admin
function checkUser(user_id, callback) {
    var sql = "SELECT * FROM users WHERE user_id=\'" + user_id + "\'";
    connection.query(sql, function(error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            if (results[0]["is_admin"] == 1) {
                callback(2);
            } else {
                callback(1);
            }
        } else {
            callback(0);
        }
    });
}

//Remove reported posts from sql results
function reportFilter(input) {
    var filtered = input.filter(function(item) {
        return item.hide_for_reporting !== 1; 
    });
    return filtered;
}

//===== PORT =====//
var port = process.env.PORT || 5000;
app.listen(port);
console.log("Cyrano server started at :" + port);
