const express = require('express');
const db = require('../db-connect');
const globals = require('../globals');
const router = express.Router();
const Admin = require('./Admin/Admin')
const Users = require('./User/Users')
const { v4: uuidv4 } = require('uuid');
// const hat = require('hat');

const AWS = require('aws-sdk');
let config;
try {
    config = require('../configs/config')
} catch {
    config = require('../configs/config.simple')
}
AWS.config.update({
    accessKeyId: config.AWS.accessKeyId,
    secretAccessKey: config.AWS.secretAccessKey,
    region: config.AWS.region
});
const sns = new AWS.SNS();


router.use('/admin', Admin);
router.use('/user', Users);

router.get('/places' , function(req, res) {
    globals.log_msg('GET /places - Invoke');
    //if the clint want specific park dog
    if (req.body.id && !isNaN(req.body.id)) {
        let temp_id = req.body.id;
        db.query('SELECT * FROM places WHERE id = ?', [temp_id], function (err, return_row) {
            if (err) {
                globals.log_msg('GET /places/get - ERROR');
                console.error(err);
                res.status(globals.status_codes.Server_Error).json();
            } else {
                fillImages(return_row);
                globals.log_msg('GET /places/get - SUCCESS');
                res.status(globals.status_codes.OK).json(return_row)
            }
        })
    } else {
        let query = '';
        let query_array = [];
        if (req.body.type && !isNaN(req.body.type)) {
            query = 'AND type = ?'
            query_array.push(req.body.type);
        }
        db.query('SELECT * FROM places WHERE deleted = 0 ' + query, query_array, function (err, result) {
            if (err) {
                globals.log_msg('GET /places/get - ERROR');
                console.error(err);
                res.status(globals.status_codes.Server_Error).json();
            } else {
                fillImages(result);
                globals.log_msg('GET /places/get - SUCCESS');
                res.status(globals.status_codes.OK).json(result)
            }
        })
    }
});

router.get('/games' , function(req, res) {
    globals.log_msg('GET /games - Invoke');
    //if the clint want specific park dog
    if (req.query.id) { // get 1 game with id = req.query.id
        let id = req.query.id;
        db.query('SELECT * FROM games WHERE id = ? AND deleted = 0', [id], function (err, result) {
            if (err) {
                globals.log_msg('GET /games - id provided - ERROR');
                console.error(err);
                res.status(globals.status_codes.Server_Error).json();
            } else {
                if (result && result.length > 0) {
                    let game = result[0];
                    db.query('SELECT * FROM game_steps WHERE game_id = ?', [game.id], function (err, result) {
                        if (err) {
                            globals.log_msg('GET /games - game steps with id provided - ERROR');
                            console.error(err);
                            res.status(globals.status_codes.Server_Error).json();
                        } else {
                            game.steps = result;
                            db.query('SELECT name FROM users WHERE id = ?', [req.user_session.id], function(err, select_result) {
                                if (err) {
                                    globals.log_msg('GET /games - game steps with id provided - ERROR');
                                    console.error(err);
                                    res.status(globals.status_codes.Server_Error).json();
                                }
                                else {
                                    globals.log_msg('GET /games - id provided - SUCCESS');
                                    console.log(select_result);
                                    game.owner_name = select_result;
                                    res.status(globals.status_codes.OK).json(game);
                                }
                            });
                        }
                    });
                } else {
                    console.log('error to find game');
                    res.status(globals.status_codes.Server_Error).json();
                }
            }
        })
    } else { // get all games
        db.query('SELECT * FROM games WHERE deleted = 0',[], function (err, games_result) {
            if (err) {
                globals.log_msg('GET /games - no id was provided - ERROR');
                console.error(err);
                res.status(globals.status_codes.Server_Error).json();
            } else {
                let games = JSON.parse(JSON.stringify(games_result));
                if (Array.isArray(games) && games.length === 0) {
                    globals.log_msg('GET /games - SUCCESS');
                    res.status(globals.status_codes.OK).json(games)
                } else {
                    let query = `SELECT * FROM game_steps WHERE game_id = ?;`.repeat(games.length).slice(0, -1);
                    let ids = []
                    for (game of games)  {
                        ids.push(game.id);
                    }
                    
                    db.query(query, ids, function (err, steps_result) {
                        if (err) {
                            globals.log_msg('GET /games - owner id provided, steps - ERROR');
                            console.error(err);
                            res.status(globals.status_codes.Server_Error).json();
                        } else {
                            if (Array.isArray(steps_result) && steps_result.length >= 0 && !Array.isArray(steps_result[0])) {
                                games[0].steps = steps_result;
                                db.query('SELECT name FROM users WHERE id = ?', [games[0].owner_id], function(err, select_result) {
                                    if (err) {
                                        globals.log_msg('GET /games - game steps with id provided - ERROR');
                                        console.error(err);
                                        res.status(globals.status_codes.Server_Error).json();
                                    }
                                    else {
                                        globals.log_msg('GET /games - id provided - SUCCESS');
                                        game.owner_name = select_result.name;
                                        res.status(globals.status_codes.OK).json(game);
                                    }
                                });
                            } else {
                                for (let i = 0; i < games.length; i++) games[i].steps = steps_result[i];
                                let query = `SELECT name FROM users WHERE id = ?;`.repeat(games.length).slice(0, -1);
                                let ids = []
                                for (game of games)  {
                                    ids.push(game.owner_id);
                                }
                                
                                db.query(query, ids, function (err, names) {
                                    if (err) {
                                        globals.log_msg('GET /games - game steps with id provided - ERROR');
                                        console.error(err);
                                        res.status(globals.status_codes.Server_Error).json();
                                    } else {
                                        globals.log_msg('GET /games - SUCCESS');
                                        let format_names = JSON.parse(JSON.stringify(names));
                                        for (let i = 0; i < format_names.length; i++) games[i].owner_name = format_names[i][0].name;
                                        res.status(globals.status_codes.OK).json(games);
                                    }
                                });
                            }
                        }
                    });
                }
            }
        });
    }
});


router.get('/business' , function(req, res) {
    globals.log_msg('GET /business - Invoke');
    if (req.body.id && !isNaN(req.body.id)) {
        let temp_id = req.body.id;
        db.query('SELECT * FROM businesses WHERE id = ?', [temp_id], function (err, return_row) {
            if (err) {
                globals.log_msg('GET /business - ERROR');
                console.error(err);
                res.status(globals.status_codes.Server_Error).json();
            } else {
                globals.log_msg('GET /business - SUCCESS');
                res.status(globals.status_codes.OK).json(return_row)
            }
        })
    } else {
        db.query('SELECT * FROM businesses', [], function (err, result) {
            if (err) {
                globals.log_msg('GET /business - ERROR');
                console.error(err);
                res.status(globals.status_codes.Server_Error).json();
            } else {
                globals.log_msg('GET /business - SUCCESS');
                res.status(globals.status_codes.OK).json(result)
            }
        })
    }
});



function fillImages(places) {
    if(places && places.length > 0) {
        places.forEach(place => {
            if (place.icon === '') {
                place.icon = 'https://s3-eu-west-1.amazonaws.com/files.find-treasure/places/icon-default.png';
            } else {
                place.icon = 'https://s3-eu-west-1.amazonaws.com/files.find-treasure/places/' + place.icon;
            }
            if (place.image === '') {
                place.image = 'https://s3-eu-west-1.amazonaws.com/files.find-treasure/places/image-default.jpg';
            } else {
                place.image = 'https://s3-eu-west-1.amazonaws.com/files.find-treasure/places/' + place.image;
            }
        });
    }
}


router.get('/login', function (req, res) {
    globals.log_msg('GET /user/login - Invoke');
    const incoming_token = JSON.parse(JSON.stringify(req.headers))['x-auth']
    if (incoming_token) {
        db.query('SELECT * FROM user_sessions, users WHERE user_sessions.user_id = users.id AND user_sessions.session = ?', [incoming_token], function(err, result) {
            if (err) {
                globals.log_msg('GET /user/login - ERROR');
                console.error(err);
                res.status(globals.status_codes.Server_Error).json()
            } else {
                if (result.length > 0) {
                    delete result[0].password;
                    globals.log_msg('GET /user/login - SUCCESS');
                    if (result[0].avatar === '') {
                        result[0].avatar = 'https://s3-eu-west-1.amazonaws.com/files.find-treasure/defaultAvater.jpg';
                    } else {
                        result[0].avatar = 'https://s3-eu-west-1.amazonaws.com/files.find-treasure/userImages/' + result[0].avatar;
                    }
                    db.query('SELECT * FROM businesses WHERE owner_id  = ?', [result[0].user_id], function(err, businesses_res) {
                        if (err) {
                            globals.log_msg('GET /user/login - ERROR');
                            console.error(err);
                            res.status(globals.status_codes.Server_Error).json();
                        } else {
                            result[0].businesses = businesses_res;
                            res.status(globals.status_codes.OK).json(result[0]);
                        }
                    })
                } else {
                    globals.log_msg('GET /admin/login - Unauthorized Credentials');
                    res.status(globals.status_codes.Unauthorized).json()
                }
            }
        })
    } else {
        globals.log_msg('GET /admin/login - Credentials Missing');
        res.status(globals.status_codes.Bad_Request).json()
    }
});

router.get('/checkValidationCode', function (req, res) {
    globals.log_msg('POST /user/check code');
    if (req && req.query && req.query.phone && req.query.code && req.query.phone && !isNaN(req.query.code)) {
        let phone = req.query.phone.replace(/\D/g,'');
        let code = req.query.code;
        if (phone.indexOf('111') === 0) {
            phone = phone.slice(3);
        }
        if (phone.indexOf('+972') === 0) {
            phone = phone.split('+972')[1];
        }

        db.query('SELECT * FROM users, user_sessions WHERE users.id = user_sessions.user_id AND phone = ? AND validation_code = ? AND user_sessions.deleted = 0', [phone, code], function(err, result) {
            if (err) {
                globals.log_msg('GET user/sendSms - ERROR check validation code');
                console.error(err);
                res.status(globals.status_codes.Bad_Request).json()
            } else {
                if (result.length > 0) {
                    let user = result[0];
                    globals.log_msg('GET user/sendSms - SUCCESS');
                    res.status(globals.status_codes.OK).json({token: user.session});
                } else {
                    res.status(globals.status_codes.Bad_Request).json({message: 'incorrect validation code'});
                }
            }
        });
    } else {
        res.status(globals.status_codes.Bad_Request).json({message: 'missing arguments'});
    }
});


function insertSessionAndSendSms(user, token, code, phone, res, debug_mode = false) {
    db.query('UPDATE user_sessions SET deleted = 1 WHERE user_id = ?',[user.id],function (err, result){
        if (err){
            console.log('error deleted old sessions', err);
        }
        db.query('INSERT INTO user_sessions(user_id, session, validation_code) VALUES (?,?,?)',[user.id, token, code],function (err, result){
            console.log('err, result', err, result);
            if (err) {
                globals.log_msg('GET user/sendSms - fail insert session');
                console.error(err);
                res.status(globals.status_codes.Bad_Request).json();
            } else {
                let user_session = result.user
                if (debug_mode) {
                    globals.log_msg('GET user/sendSms - SUCCESS');
                    res.status(globals.status_codes.OK).json();
                } else {
                    sendSms(phone, 'קוד האימות שלך הוא: ' + code, (err, result) => {
                        if (err) {
                            globals.log_msg('GET user/sendSms - fail send sms');
                            res.status(globals.status_codes.Bad_Request).json(err);
                        } else {
                            globals.log_msg('GET user/sendSms - SUCCESS');
                            res.status(globals.status_codes.OK).json();
                        }
                    });
                }
            }
        });
    });
}

router.get('/sendSms', function (req, res) {
    globals.log_msg('POST /user/sendSms');
    if (req && req.query && req.query.phone) {
        let name = req.query.name ? req.query.name : '';
        let user_type = req.query.user_type ? req.query.user_type : 1;
        let phone = req.query.phone.replace(/\D/g,'');
        /* testing login no sms */
        let debug_mode = false;
        if (phone.indexOf('111') === 0) {
            debug_mode = true;
            phone = phone.slice(3);
        }
        if (phone.indexOf('+972') !== 0) {
            phone = '+972' + phone;
        }

        db.query('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone.split('+972')[1]], function(err, result) {
            if (err) {
                globals.log_msg('GET user/sendSms - ERROR get user');
                console.error(err);
                res.status(globals.status_codes.Bad_Request).json()
            } else {
                let user = result[0];
                let token = uuidv4();
                let code = Math.floor(100000 + Math.random() * 900000);
                if (debug_mode) {
                    code = 123456;
                }
                if (result.length === 0) {
                    db.query('INSERT INTO users (name, user_type, email, phone, password, avatar) VALUES (?,?,?,?,?,?)',
                        [name, user_type, '', phone.split('+972')[1], '', ''],function (err, result){
                            if (err) {
                                globals.log_msg('GET user/sendSms - fail insert user');
                                console.error(err);
                                res.status(globals.status_codes.Bad_Request).json();
                            } else {
                                db.query('SELECT * FROM users WHERE id = ?', [result.insertId], function(err, result) {
                                    if (err) {
                                        globals.log_msg('GET user/sendSms - fail insert user');
                                        console.error(err);
                                        res.status(globals.status_codes.Bad_Request).json();
                                    } else {
                                        user = result[0];
                                        insertSessionAndSendSms(user, token, code, phone, res, debug_mode);
                                    }
                                });
                            }
                        });
                } else {
                    insertSessionAndSendSms(user, token, code, phone, res, debug_mode);
                }
            }
        });
    } else {
        res.status(globals.status_codes.Bad_Request).json();
    }
});

function sendSms(phone, message, callback) {
    console.log('got param: ', phone, message);
    sns.publish({
        Message: message,
        PhoneNumber: phone
    }, callback);
}

module.exports = router;
