const express = require('express');
const globals = require('../../globals');
const db = require('../../db-connect');

const router = express.Router();

router.get('/games', (req, res) => {
  db.query('SELECT * FROM games WHERE deleted = 0 AND owner_id = ?', [req.user_session.id], (err, games_result) => {
    if (err) {
      globals.log_msg('GET /games - owner id provided - ERROR');
      console.error(err);
      res.status(globals.status_codes.Server_Error).json();
    } else {
      const games = JSON.parse(JSON.stringify(games_result));
      if (Array.isArray(games) && games.length === 0) {
        globals.log_msg('GET /games - owner id provided - SUCCESS');
        res.status(globals.status_codes.OK).json(games);
      } else {
        const query = 'SELECT * FROM game_steps WHERE game_id = ?;'.repeat(games.length).slice(0, -1);
        const ids = [];
        for (game of games) {
          ids.push(game.id);
        }

        db.query(query, ids, (err, steps_result) => {
          if (err) {
            globals.log_msg('GET /games - owner id provided, steps - ERROR');
            console.error(err);
            res.status(globals.status_codes.Server_Error).json();
          } else {
            if (Array.isArray(steps_result) && steps_result.length >= 0 && !Array.isArray(steps_result[0])) {
              games[0].steps = steps_result;
            } else {
              for (let i = 0; i < games.length; i++) games[i].steps = steps_result[i];
            }
            globals.log_msg('GET /games - owner id provided, steps - SUCCESS');
            res.status(globals.status_codes.OK).json(games);
          }
        });
      }
    }
  });
});

router.post('/create', (req, res) => {
  globals.log_msg('POST /user/business/add - Invoke');
  checkPermission(req.body, req.headers, (result) => {
    if (result && result.status) {
      res.status(result.status).json(result.message);
    } else {
      db.query('INSERT INTO businesses SET ?', result, (err, inserted_row) => {
        if (err) {
          globals.log_msg('POST /user/business/add - ERROR');
          console.error(err);
          res.status(globals.status_codes.Server_Error).json();
        } else if (inserted_row && inserted_row.insertId) {
          db.query('SELECT * FROM businesses WHERE id = ?', [inserted_row.insertId], (err, result) => {
            if (err) {
              globals.log_msg('POST /user/business/add - ERROR get business');
              console.error(err);
              res.status(globals.status_codes.Server_Error).json();
            } else {
              globals.log_msg('POST /user/business/add - SUCCESS');
              res.status(globals.status_codes.OK).json(result[0]);
            }
          });
        }
      });
    }
  });
});

router.patch('/edit', (req, res) => {
  if (req.body && req.body.id && !isNaN(req.body.id)) {
    const { id } = req.body;
    delete req.body.id;
    checkPermission(req.body, req.headers, (result) => {
      if (result && result.status) {
        res.status(result.status).json(result.message);
      } else {
        db.query('UPDATE businesses SET ? WHERE id = ?', [result, id], (err, inserted_row) => {
          if (err) {
            globals.log_msg('POST /user/business/add - ERROR');
            console.error(err);
            res.status(globals.status_codes.Server_Error).json();
          } else {
            globals.log_msg('POST /user/business/add - SUCCESS');
            res.status(globals.status_codes.OK).json();
          }
        });
      }
    });
  }
});

function checkPermission(data, headers, callback) {
  const {
    name,
    owner_id,
    dog_friendly,
    description,
    phone,
    image,
    address,
    type,
  } = data;

  if (!name || !owner_id || !phone || isNaN(type)) {
    globals.log_msg('POST /business/add - At least 1 field is missing');
    callback({ status: globals.status_codes.Bad_Request, message: 'missing arguments' });
  } else {
    const business = {
      name,
      owner_id,
      dog_friendly: dog_friendly || 0,
      description: description || '',
      phone,
      image: image || '',
      address: address || '',
      type,
    };

    db.query('SELECT * FROM users WHERE id = ?', [owner_id], (err, result) => {
      if (err) {
        globals.log_msg('POST /user/business/add - ERROR');
        console.error(err);
        callback({ status: globals.status_codes.Server_Error });
      } else if (result && result.length > 0) {
        callback(business);
      } else {
        globals.log_msg('POST /user/business/add - invalid owner_id');
        console.error(err);
        callback({ status: globals.status_codes.Bad_Request, message: 'invalid owner_id' });
      }
    });
  }
}
module.exports = router;
