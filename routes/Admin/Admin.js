const globals = require('../../globals');
const express = require('express');
const db = require('../../db-connect');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const bcrypt = require('bcryptjs');

const A_InterestPoints = require('./Admin_Interest_Points');

router.use((req, res, next) => {
  if (req.originalUrl == '/admin/login' || req.originalUrl == '/admin/register') next();
  else {
    globals.log_msg('POST /admin/* - Middleware');
    const incoming_token = JSON.parse(JSON.stringify(req.headers))['x-auth'];
    if (incoming_token) {
      db.query('SELECT * FROM user_sessions, users WHERE user_sessions.user_id = users.id AND user_sessions.session = ? AND user_type = ?', [incoming_token, globals.user_types.admin], (err, result) => {
        if (err) {
          globals.log_msg('POST /admin/* - ERROR');
          console.error(err);
          res.status(globals.status_codes.Server_Error).json();
        } else if (result.length > 0) {
          globals.log_msg('POST /admin/* - SUCCESS');
          next();
        } else {
          globals.log_msg('POST /admin/* - Unauthorized Access Attempt');
          res.status(globals.status_codes.Forbidden).json();
        }
      });
    } else {
      globals.log_msg('POST /admin/* - Missing Credentials');
      res.status(globals.status_codes.Forbidden).json();
    }
  }
});

router.use(globals.log_func);

router.use('/interesting_point', A_InterestPoints);

// REGISTER REQUEST
router.post('/register', (req, res) => {
  console.log('<LOG> - POST /admin/register');
  bcrypt.hash(req.body.pass, 10, (err, hash) => {
    const values = {
      name: req.body.phone, email: req.body.phone, avatar: req.body.phone, deleted: 0, phone: req.body.phone, password: hash, user_type: 0,
    };
    db.query('INSERT INTO users SET ?', values, (err, result) => {
      if (err) {
        console.log('<LOG> - POST /admin/register - ERROR');
        console.error(err);
        res.status(globals.status_codes.Server_Error).json();
      } else {
        console.log('<LOG> - POST /admin/register - SUCCESS');
        res.status(globals.status_codes.OK).json();
      }
    });
  });
});
// LOGIN REQUEST
router.post('/login', (req, res) => {
  globals.log_msg('POST /admin/login - Invoke');
  const { phone } = req.body;
  db.query('SELECT * FROM users WHERE phone = ?', [phone], (err, phone_query_result) => {
    if (err) {
      globals.log_msg('POST /admin/login - ERROR');
      console.error(err);
      res.status(globals.status_codes.Server_Error).json();
    } else if (phone_query_result.length > 0) {
      const password = req.body.pass;
      bcrypt.compare(password, phone_query_result[0].password, (err, pass_compare) => {
        if (err) {
          console.error(err);
          res.status(globals.status_codes.Server_Error).json();
        } else if (!pass_compare) {
          globals.log_msg('POST /admin/login - Wrong Credentials pass');
          res.status(globals.status_codes.Unauthorized).json();
        } else {
          delete phone_query_result[0].password;
          const token = uuidv4();
          db.query('INSERT INTO user_sessions(user_id,session) VALUES (?,?)', [phone_query_result[0].id, token], (err, insert_query_result) => {
            if (err) {
              globals.log_msg('POST /admin/login - Wrong Values inserted');
              console.error(err);
              res.status(globals.status_codes.Unauthorized).json();
            } else {
              globals.log_msg('POST /admin/login - SUCCESS');
              res.status(globals.status_codes.OK).json({
                token,
                user: phone_query_result[0],
              });
            }
          });
        }
      });
    } else {
      globals.log_msg('POST /admin/login - Wrong Credentials');
      res.status(globals.status_codes.Unauthorized).json();
    }
  });
});
// ADMIN LOGIN
router.get('/login', (req, res) => {
  globals.log_msg('GET /admin/login - Invoke');
  const incoming_token = JSON.parse(JSON.stringify(req.headers))['x-auth'];
  if (incoming_token) {
    db.query('SELECT * FROM user_sessions, users WHERE user_sessions.user_id = users.id AND user_sessions.session = ?', [incoming_token], (err, result) => {
      if (err) {
        globals.log_msg('GET /admin/login - ERROR');
        console.error(err);
        res.status(globals.status_codes.Server_Error).json();
      } else if (result.length > 0) {
        delete result[0].password;
        globals.log_msg('GET /admin/login - SUCCESS');
        res.status(globals.status_codes.OK).json(result[0]);
      } else {
        globals.log_msg('GET /admin/login - Unauthorized Credentials');
        res.status(globals.status_codes.Unauthorized).json();
      }
    });
  } else {
    globals.log_msg('GET /admin/login - Credentials Missing');
    res.status(globals.status_codes.Bad_Request).json();
  }
});

router.get('/businesses', (req, res) => {
  globals.log_msg('GET /admin/businesses - Invoke');
  db.query('SELECT businesses.*, users.name as owner_name FROM businesses, users WHERE users.id = businesses.owner_id', [], (err, result) => {
    if (err) {
      globals.log_msg('GET /admin/businesses - ERROR');
      console.error(err);
      res.status(globals.status_codes.Server_Error).json();
    } else {
      globals.log_msg('GET /admin/businesses - SUCCESS');
      res.status(globals.status_codes.OK).json(result);
    }
  });
});

router.get('/getAdmins', (req, res) => {
  globals.log_msg('GET /admin/getAdmins - Invoke');
  db.query('SELECT id, name, email, phone, created_at FROM users WHERE user_type = ?', [0], (err, result) => {
    if (err) {
      globals.log_msg('GET /admin/getAdmins - ERROR');
      console.error(err);
      res.status(globals.status_codes.Server_Error).json();
    } else {
      globals.log_msg('GET /admin/getAdmins - SUCCESS');
      res.status(globals.status_codes.OK).json(result);
    }
  });
});

router.get('/getPlayers', (req, res) => {
  globals.log_msg('GET /admin/getPlayers - Invoke');
  db.query('SELECT users.name, users.user_type, users.email, users.phone, users.avatar, users.birthday, users.hobbies, users.created_at, users.update_at FROM users, active_players WHERE users.id = active_players.user_id', (err, result) => {
    if (err) {
      globals.log_msg('GET /admin/getPlayers - ERROR');
      console.error(err);
      res.status(globals.status_codes.Server_Error).json();
    } else {
      globals.log_msg('GET /admin/getPlayers - SUCCESS');
      res.status(globals.status_codes.OK).json(result);
    }
  });
});


module.exports = router;
