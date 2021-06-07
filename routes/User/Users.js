const express = require('express');
const db = require('../../db-connect');
const globals = require('../../globals');

const router = express.Router();
const AWS = require('aws-sdk');

const GAMES = require('./Games');
const PLACES = require('./Places');
const BUSINESS = require('./Business');

const sns = new AWS.SNS();

router.use((req, res, next) => {
  globals.log_msg('POST /user/* - Middleware');
  const incoming_token = JSON.parse(JSON.stringify(req.headers))['x-auth'];
  console.log('incoming_token: ', incoming_token);
  if (incoming_token) {
    db.query('SELECT * FROM user_sessions, users WHERE user_sessions.user_id = users.id AND user_sessions.session = ?', [incoming_token], (err, result) => {
      if (err) {
        globals.log_msg('POST /user/* - ERROR');
        console.error(err);
        res.status(globals.status_codes.Server_Error).json();
      } else if (result.length > 0) {
        globals.log_msg('POST /user/* - SUCCESS');
        req.user_session = result[0];
        next();
      } else {
        globals.log_msg('POST /user/* - Unauthorized Access Attempt');
        res.status(globals.status_codes.Unauthorized).json();
      }
    });
  } else {
    globals.log_msg('POST /user/* - Missing Credentials');
    res.status(globals.status_codes.Unauthorized).json();
  }
});

router.use(globals.log_func);
router.use('/games', GAMES);
router.use('/places', PLACES);
router.use('/business', BUSINESS);

router.post('/editUser', (req, res) => {
  globals.log_msg('GET /user/edit - Invoke');
  if (req.user_session.id !== req.body.id) {
    globals.log_msg('POST /user/* - Unauthorized Access Attempt');
    res.status(globals.status_codes.Unauthorized).json();
    return;
  }

  const user = {
    name: typeof req.body.name === 'string' ? req.body.name.replace(';', '').replace(',', '') : '',
    email: typeof req.body.email === 'string' ? escape(req.body.email) : '',
    avatar: typeof req.body.avatar === 'string' ? escape(req.body.avatar) : '',
    birthday: typeof req.body.birthday === 'string' ? req.body.birthday : null,
    gender: isNaN(req.body.gender) ? null : (req.body.gender === 0 ? 0 : 1),
    hobbies: isNaN(req.body.hobbies) ? 0 : req.body.hobbies,
  };
  if (user.avatar === '') {
    delete user.avatar;
  }
  if (user.email === '') {
    delete user.email;
  }
  if (user.name === '') {
    delete user.name;
  }
  if (user.birthday === '') {
    delete user.birthday;
  }
  if (user.gender === null) {
    delete user.gender;
  }

  db.query('UPDATE users SET ? WHERE id = ?', [user, req.body.id], (err, result) => {
    if (err) {
      globals.log_msg('GET /user/edit - ERROR');
      console.error(err);
      res.status(globals.status_codes.Server_Error).json();
    } else {
      globals.log_msg('GET /user/login - SUCCESS');
      res.status(globals.status_codes.OK).json();
    }
  });
});


module.exports = router;
