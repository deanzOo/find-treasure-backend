const express = require('express');
const globals = require('../../globals');
const db = require('../../db-connect');

const router = express.Router();

// ADD REQUEST INTEREST POINT
router.post('/', (req, res) => {
  globals.log_msg('POST /admin/interesting_point - Invoke');

  const {
    type,
    name,
    street,
    neighborhood,
    operator,
    handicapped,
    condition,
  } = req.body;

  if (name == undefined
            || neighborhood == undefined
            || operator == undefined
            || handicapped == undefined
            || condition == undefined) {
    globals.log_msg('POST /interesting_point - At least 1 field is missing');
    res.status(globals.status_codes.Bad_Request).json();
  } else if (typeof (name) !== 'string'
            || typeof (neighborhood) !== 'string'
            || typeof (operator) !== 'string'
            || (typeof (handicapped) !== 'boolean' && typeof (handicapped) !== 'number')
            || typeof (condition) !== 'number') {
    globals.log_msg('POST /interesting_point - Error with type of at least 1 input field');
    res.status(globals.status_codes.Bad_Request).json();
  } else {
    const values = {
      type, name, neighborhood, operator, handicapped, condition,
    };
    if (street !== undefined) { values.street = street; }

    db.query('INSERT INTO places SET ?', values, (err, result) => {
      if (err) {
        globals.log_msg('POST /admin/interesting_point - ERROR');
        console.error(err);
        res.status(globals.status_codes.Server_Error).json();
      } else {
        db.query('SELECT * FROM places WHERE id = (?)', [result.insertId], (err, result) => {
          if (err) {
            globals.log_msg('POST /admin/interesting_point - ERROR');
            console.error(err);
            res.status(globals.status_codes.Server_Error).json();
          } else {
            globals.log_msg('POST /admin/interesting_point - SUCCESS');
            res.status(globals.status_codes.OK).json(result[0]);
          }
        });
      }
    });
  }
});

// GET REQUEST INTEREST POINT
router.get('/', (req, res) => {
  globals.log_msg('GET /interestpoint - Invoke');
  if (req.body.id) {
    const temp_id = req.body.id;
    db.query('SELECT * FROM places WHERE id = ? AND deleted = 0', [temp_id], (err, result) => {
      if (err) {
        globals.log_msg('GET /interest point - ERROR');
        console.error(err);
        res.status(globals.status_codes.Server_Error).json();
      } else {
        globals.log_msg('GET /interest point - SUCCESS');
        res.status(globals.status_codes.OK).json(result[0]);
      }
    });
  }
  // get all of the interest points
  else {
    db.query('SELECT * FROM places WHERE deleted =0', [], (err, result) => {
      if (err) {
        globals.log_msg('GET /interest point - ERROR');
        console.error(err);
        res.status(globals.status_codes.Server_Error).json();
      } else {
        globals.log_msg('GET /interest point - SUCCESS');
        res.status(globals.status_codes.OK).json(result);
      }
    });
  }
});
// DELETE REQUEST INTEREST POINT   -> deleted only by ID!!!
router.delete('/', (req, res) => {
  if (req.query.id) {
    const temp_id = req.query.id;
    console.log('id = ', temp_id);
    db.query('UPDATE places SET deleted = 1 WHERE deleted = 0 AND id = ?', [temp_id], (err, result) => {
      if (err) {
        globals.log_msg('DELETE /interest point - ERROR');
        console.error(err);
        res.status(globals.status_codes.Server_Error).json();
      } else if (result.affectedRows > 0) {
        res.status(globals.status_codes.OK).json();
      } else {
        globals.log_msg('DELETE /interestpoint - Wrong Parameters');
        res.status(globals.status_codes.Bad_Request).json();
      }
    });
  }
});
// todo update for interesting points
// UPDATE INTERESTING POINTS REQUEST
router.patch('/', (req, res) => {
  globals.log_msg('UPDATE /interesting_point - Invoke');
  const {
    id,
    name,
    type,
    street,
    neighborhood,
    operator,
    handicapped,
    condition,
    icon,
    image,
    active,
  } = req.body;

  if (name == undefined
            || neighborhood == undefined
            || operator == undefined
            || handicapped == undefined
            || condition == undefined
            || active == undefined)
        {
            globals.log_msg('UPDATE /interesting_point - At least 1 field is missing');
            res.status(globals.status_codes.Bad_Request).json()
        }
        else if (typeof(name) !== 'string'
            || typeof(neighborhood) !== 'string'
            || typeof(operator) !== 'string'
            || (typeof(handicapped) !== 'boolean' && typeof(handicapped) !== 'number')
            || typeof(condition) !== 'number'
            || (typeof(active) !== 'boolean' && typeof(active) !== 'number'))
        {
            globals.log_msg('UPDATE /interesting_point - Error with type of at least 1 input field');
            res.status(globals.status_codes.Bad_Request).json()
        } else {
            var values = {id:id, name:name, type:type,neighborhood:neighborhood, operator:operator, handicapped:handicapped, condition:condition,
                    active:active};
            if (image !== undefined)
                values.image = image;
            if (icon !== undefined)
                values.icon = icon;
            if (street !== undefined)
                values.street = street;

    const temp_id = values.id;
    db.query('UPDATE places SET ? WHERE id = ?', [values, temp_id], (err, update_result) => {
      if (err) {
        globals.log_msg('PATCH /interesting_point - ERROR');
        console.error(err);
        res.status(globals.status_codes.Server_Error).json();
      } else {
        db.query('SELECT * FROM places WHERE id = ?', [temp_id], (err, select_result) => {
          if (err) {
            globals.log_msg('PATCH /interesting_point - ERROR');
            console.error(err);
            res.status(globals.status_codes.Server_Error).json();
          }
          globals.log_msg('PATCH /interesting_point - SUCCESS');
          res.status(globals.status_codes.OK).json(select_result[0]);
        });
      }
    });
  }
});

module.exports = router;
