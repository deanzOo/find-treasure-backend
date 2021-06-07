const express = require('express');
const ld = require('lodash');
const globals = require('../../globals');
const db = require('../../db-connect');

const router = express.Router();

router.post('/next_stage', (req, res) => {
  globals.log_msg('POST /user/games/next_stage - Invoke');
  if (req.body.game_id) {
    // Check if enrolled to game

    if (req.body.secret_key) {
      db.query('SELECT * FROM active_players WHERE user_id = ? AND game_id = ? AND finish_at IS NULL', [req.user_session.id, req.body.game_id], (err, active_players_records) => {
        if (err) {
          globals.log_msg('POST /user/games/next_stage - ERROR');
          console.error(err);
          res.status(globals.status_codes.Server_Error).json();
        } else if (active_players_records.length > 0) {
          const active_player_record = active_players_records[0];
          db.query('SELECT * FROM game_steps WHERE game_id = ?', [req.body.game_id], (err, game_steps_records) => {
            if (err) {
              globals.log_msg('POST /user/games/next_stage - ERROR');
              console.error(err);
              res.status(globals.status_codes.Server_Error).json();
            } else if (game_steps_records.length > 0) {
              sorted_game_steps_records = ld.sortBy(game_steps_records, ['step_num']);

              const current_step_id = active_player_record.step_id;

              const current_step_index = ld.findIndex(sorted_game_steps_records, ['id', current_step_id]);

              const current_step = sorted_game_steps_records[current_step_index];

              console.log(current_step.secret_key, req.body.secret_key);
              if (current_step.secret_key == req.body.secret_key) {
                const next_step_index = ld.findIndex(sorted_game_steps_records, ['step_num', current_step.step_num + 1]);
                if (next_step_index != -1) { // if we found an index => there's a next step
                  // there is a next step
                  const next_step_id = sorted_game_steps_records[next_step_index].id;
                  db.query('UPDATE active_players SET step_id = ? WHERE user_id = ? AND game_id = ?', [next_step_id, req.user_session.id, req.body.game_id], (err, update_result) => {
                    if (err) {
                      globals.log_msg('POST /user/games/next_stage - ERROR');
                      console.error(err);
                      res.status(globals.status_codes.Server_Error).json({ message: 'Error updating a record' });
                    } else {
                      globals.log_msg('POST /user/games/next_stage - SUCCESS');
                      active_player_record.step_id = next_step_id;
                      res.status(globals.status_codes.OK).json(active_player_record);
                    }
                  });
                } else {
                  // no next step => it's the last step
                  db.query('UPDATE active_players SET finish_at = NOW() WHERE user_id = ? AND game_id = ?', [req.user_session.id, req.body.game_id], (err, update_result) => {
                    if (err) {
                      globals.log_msg('POST /user/games/next_stage - ERROR');
                      console.error(err);
                      res.status(globals.status_codes.Server_Error).json({ message: 'Error updating a record' });
                    } else {
                      globals.log_msg('POST /user/games/next_stage - SUCCESS');
                      active_player_record.finish_at = (new Date()).toString();
                      res.status(globals.status_codes.OK).json(active_player_record);
                    }
                  });
                }
              } else {
                globals.log_msg('POST /user/games/next_stage - ERROR');
                res.status(globals.status_codes.Bad_Request).json({ message: 'secret key incorrect.' });
              }
            } else {
              globals.log_msg('POST /user/games/next_stage - ERROR');
              console.log('log');
              res.status(globals.status_codes.No_Content).json({ message: 'game has no steps' });
            }
          });
        } else {
          globals.log_msg('POST /user/games/next_stage - ERROR');
          res.status(globals.status_codes.Unauthorized).json({ message: 'user is not enrolled in the game or already finished game' });
        }
      });
    } else {
      globals.log_msg('POST /user/games/next_stage - ERROR');
      res.status(globals.status_codes.Bad_Request).json({ message: `no secret key was supplied.${JSON.stringify(req.body)}` });
    }
  } else {
    globals.log_msg('POST /user/games/next_stage - ERROR');
    res.status(globals.status_codes.Bad_Request).json({ message: `no game id was supplied.${JSON.stringify(req.body)}` });
  }
});

router.get('/startGame', (req, res) => {
  globals.log_msg('GET /user/games/startgame');
  db.query('SELECT * FROM active_players WHERE game_id = ? AND user_id = ?', [req.query.game_id, req.user_session.id], (err, isActive) => {
    if (err) {
      globals.log_msg('GET /user/games/startgame/:id - ERROR');
      console.error(err);
      res.status(globals.status_codes.Server_Error).json();
    } else if (isActive.length > 0) {
      res.status(globals.status_codes.Unauthorized).json({ message: 'User is already enrolled to game' });
    } else {
      db.query('SELECT * FROM games WHERE id = ?', [req.query.game_id], (err, games) => {
        if (err) {
          globals.log_msg('GET /user/games/startgame/:id - ERROR');
          console.error(err);
          res.status(globals.status_codes.Server_Error).json();
        }
        if (games.length == 0) {
          globals.log_msg('GET /user/games/startgame/:id - ERROR');
          res.status(globals.status_codes.Server_Error).json({ message: 'no game with the requested id exists' });
        } else {
          db.query('SELECT * FROM game_steps WHERE game_id = ? AND step_num = 1', [req.query.game_id], (err, game_step) => {
            if (err) {
              globals.log_msg('GET /user/games/startgame/:id - ERROR');
              console.error(err);
              res.status(globals.status_codes.Server_Error).json();
            } else {
              const info = {
                game_id: req.query.game_id,
                user_id: req.user_session.id,
                step_id: game_step[0].id,
              };
              db.query('INSERT INTO active_players SET ?', info, (err, insert_res) => {
                if (err) {
                  globals.log_msg('GET /user/games/startgame/:id - ERROR');
                  console.error(err);
                  res.status(globals.status_codes.Server_Error).json();
                }
                res.status(globals.status_codes.OK).json();
              });
            }
          });
        }
      });
    }
  });
});

router.patch('/endgame', (req, res) => {
  globals.log_msg('PATCH /user/games/endgame/:id');
  const { game_id } = req.body;
  if (!req.body.game_id) {
    globals.log_msg('PATCH /user/games/endgame/ - ERROR');
    console.error(err);
    res.status(globals.status_codes.Bad_Request).json();
  } else {
    db.query('UPDATE active_players SET finish_at = NOW() WHERE user_id = ? AND game_id = ?', [req.user_session.id, req.body.game_id], (err, games) => {
      if (err) {
        globals.log_msg('PATCH /user/games/endgame/:id - ERROR');
        console.error(err);
        res.status(globals.status_codes.Server_Error).json();
      }
      res.status(globals.status_codes.OK).json();
    });
  }
});

// REQUEST to get Game list per user
router.get('/mygames', (req, res) => {
  globals.log_msg('GET /user/myGames/get - Invoke');
  if (req.user_session.id !== req.body.id && !isNaN(req.body.id)) {
    globals.log_msg('POST /user/mygames - Unauthorized Access Attempt');
    res.status(globals.status_codes.Unauthorized).json();
  }
  db.query(`SELECT DISTINCT game_steps.*, games.*, active_players.* 
    FROM users, games, active_players, game_steps WHERE users.id = ? AND 
    games.id = active_players.game_id AND 
    active_players.user_id = users.id AND
    game_steps.id = active_players.step_id`, [req.user_session.id], (err, result) => {
    if (err) {
      globals.log_msg('GET /user/myGames/get - ERROR');
      console.error(err);
      res.status(globals.status_codes.Server_Error).json();
    } else {
      globals.log_msg('GET /user/games/get - SUCCESS');
      res.status(globals.status_codes.OK).json(result);
    }
  });
});

// router.patch('/myGames', function (req,res) {
//     globals.log_msg('GET /user/myGames/patch - Invoke');
//     if(req.body.user_id && req.body.game_id)
//     {
//         let user_id = req.body.user_id;
//         let game_id = req.body.game_id;
//         let now_date = Date.now();
//         db.query('UPDATE active_players SET finish_at = ? WHERE user_id = ? AND game_id = ?', [now_date,user_id,game_id],function (err,result) {
//             if (err) {
//                 globals.log_msg('GET /user/myGames/patch - ERROR');
//                 console.error(err);
//                 res.status(globals.status_codes.Server_Error).json();
//         }else{
//                 globals.log_msg('GET /user/games/patch - SUCCESS');
//                 res.status(globals.status_codes.OK).json(result)
//             }
//         })
//     } else {
//         globals.log_msg('GET /user/myGames/patch - missing arguments');
//         res.status(globals.status_codes.Server_Error).json({message: 'missing arguments'});
//     }
// });

router.post('/create', (req, res) => {
  globals.log_msg('POST /user/games/add - Invoke');

  const checkDataResult = checkData(req.body);
  if (checkDataResult && checkDataResult.status) {
    res.status(checkDataResult.status).json({ message: checkDataResult.message });
  }

  /* check for existing owner user */
  db.query('SELECT * FROM users WHERE id = ?', [req.body.owner_id], (err, result) => {
    if (err || !result || !result.length) {
      globals.log_msg('POST /games/create - ERROR in search owner');
      console.error(err);
      res.status(globals.status_codes.Server_Error).json({ message: 'can not find owner by owner_id' });
      return;
    }
    const game = {
      owner_id: req.body.owner_id,
      name: req.body.name,
      start: req.body.start,
      end: req.body.end,
      start_location: req.body.start_location,
      finish_location: req.body.finish_location,
      deleted: 0,
    };

    /* Begin transaction */
    db.beginTransaction((err) => {
      if (err) {
        globals.log_msg('POST /games/create - ERROR create transaction');
        console.error(err);
        res.status(globals.status_codes.Server_Error).json();
        return;
      }

      db.query('INSERT INTO games SET ?', game, (err, result) => {
        if (err) {
          globals.log_msg('POST /games/create - ERROR insert game');
          console.error(err);
          res.status(globals.status_codes.Server_Error).json();
          return;
        }
        const insertSteps = [];

        req.body.steps.forEach((step) => {
          insertSteps.push([
            result.insertId,
            step.step_num,
            step.name,
            step.secret_key,
            step.start_location,
            step.finish_location,
            step.description ? step.description : '',
          ]);
        });

        if (insertSteps.length > 0) {
          const sql = 'INSERT INTO game_steps '
                    + '(game_id, step_num, name, secret_key, start_location, finish_location, description) VALUES ?';

          db.query(sql, [insertSteps], (err, insertion_res) => {
            if (err) {
              globals.log_msg('POST /games/create - ERROR insert steps');
              console.error(err);
              db.rollback(() => {
                console.log('rollback error', err);
              });
              res.status(globals.status_codes.Server_Error).json();
            } else {
              db.commit((err, commit_res) => {
                if (err) {
                  db.rollback(() => {
                    throw err;
                  });
                }
                res.status(globals.status_codes.OK).json({ id: insertion_res.insertId });
                globals.log_msg('Transaction Complete.');
              });
            }
          });
        } else {
          db.commit((err) => {
            if (err) {
              db.rollback(() => {
                throw err;
              });
            }
            res.status(globals.status_codes.OK).json();
            globals.log_msg('Transaction Complete.');
          });
        }
      });
    });
    /* End transaction */
  });
});

router.patch('/edit', (req, res) => {
  globals.log_msg('POST /user/games/update - Invoke');
  if (!req.body.id) {
    res.status(globals.status_codes.Bad_Request).json({ message: 'missing argument id' });
    return;
  }
  req.body.steps = []; // todo remove this
  const checkDataResult = checkData(req.body);
  if (checkDataResult && checkDataResult.status) {
    res.status(checkDataResult.status).json({ message: checkDataResult.message });
    return;
  }

  /* check for existing owner user */
  db.query('SELECT * FROM users WHERE id = ?', [req.body.owner_id], (err, result) => {
    if (err || !result || !result.length) {
      globals.log_msg('POST /games/create - ERROR in search owner');
      console.error(err);
      res.status(globals.status_codes.Server_Error).json({ message: 'can not find owner by owner_id' });
      return;
    }
    const game = {
      owner_id: req.body.owner_id,
      name: req.body.name,
      start: req.body.start,
      end: req.body.end,
      start_location: req.body.start_location,
      finish_location: req.body.finish_location,
      deleted: 0,
    };

    db.query('UPDATE games SET ? WHERE id = ?', [game, req.body.id], (err, update_result) => {
      if (err) {
        globals.log_msg('POST /games/create - ERROR insert game');
        console.error(err);
        res.status(globals.status_codes.Server_Error).json();
      } else {
        db.query('SELECT * FROM games WHERE id = ?', [req.body.id], (err, select_result) => {
          if (err) {
            globals.log_msg('POST /games/create - ERROR insert game');
            console.error(err);
            res.status(globals.status_codes.Server_Error).json();
          }
          res.status(globals.status_codes.OK).json(select_result[0]);
          // todo update steps
        });
      }
    });
  });
});

router.get('/subscribed', (req, res) => {
  globals.log_msg('POST /user/games/subscribed - Invoke');
  if (req.body.game_id && !isNaN(req.body.game_id)) {
    db.query('SELECT * FROM games WHERE id = ? AND owner_id = ?', [req.body.game_id, req.body.owner_id], (err, result) => {
      if (err) {
        globals.log_msg('GET /user/games/played - ERROR');
        console.error(err);
        res.status(globals.status_codes.Server_Error).json();
      } else if (result && result.length == 0) { res.status(globals.status_codes.Unauthorized).json(); }
    });
  } else {
    res.status(globals.status_codes.Unauthorized).json();
  }
  db.query('SELECT * FROM active_players, users WHERE users.id = active_players.user_id AND game_id = ?', [req.body.game_id], (err, result) => {
    if (err) {
      globals.log_msg('POST /games//played - ERROR find players');
      console.error(err);
      res.status(globals.status_codes.Bad_Request).json({ message: 'cannot find players by game_id' });
      return;
    }
    if (result && result.length) {
      result.forEach((player) => {
        delete player.password;
        delete player.user_type;
        delete player.hobbies;
        delete player.deleted;
      });
    }
    globals.log_msg('GET /user/games/played - SUCCESS');
    res.status(globals.status_codes.OK).json(result);
  });
});

function checkData(data) {
  const {
    owner_id,
    name,
    start,
    end,
    start_location,
    finish_location,
    steps,
  } = data;

  if (!name || !owner_id || !start || !end || !start_location || !finish_location) {
    globals.log_msg('POST /games/create - At least 1 field is missing');
    return { status: globals.status_codes.Bad_Request, message: 'missing argument' };
  }
  if (typeof owner_id !== 'number'
    || typeof name !== 'string'
    || typeof start !== 'string'
    || typeof end !== 'string'
    || typeof start_location !== 'number'
    || typeof finish_location !== 'number') {
    globals.log_msg('POST /games/create - Error with type of at least 1 input field');
    return { status: globals.status_codes.Bad_Request, message: 'type error in game field' };
  }
  if (steps && Array.isArray(steps)) {
    let error = false;
    let messageError = '';
    steps.forEach((step) => {
      if (!step.name || !step.secret_key || !step.start_location || !step.finish_location || !step.step_num) {
        error = true;
        messageError = 'missing argument';
      } else if (typeof step.name !== 'string' || typeof step.secret_key !== 'string'
                || typeof step.start_location !== 'number' || typeof step.finish_location !== 'number') {
        error = true;
        messageError = 'type error in game step';
      }
    });
    if (error) {
      globals.log_msg('POST /games/create - Error with game step');
      return { status: globals.status_codes.Bad_Request, message: messageError };
    }
    return {};
  }
  if (!steps) {
    return {};
  }
  globals.log_msg('POST /games/create - Error with game steps');
  return { status: globals.status_codes.Bad_Request, message: 'error with game steps' };

  return;
}


module.exports = router;
