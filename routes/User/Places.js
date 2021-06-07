const express = require('express');
const globals = require('../../globals');
const db = require('../../db-connect');

const router = express.Router();

// ADD PARK REQUEST

router.delete('/', (req, res) => {
  globals.log_msg('DELETE /user/places - Invoke');
  if (req.query.id && !isNaN(req.query.id)) {
    db.query('UPDATE places SET deleted = 1 WHERE id = ?', [req.query.id], (err, result) => {
      if (err) {
        globals.log_msg('DELETE /user/places - ERROR');
        console.error(err);
        res.status(globals.status_codes.Server_Error).json();
      } if (result.affectedRows > 0) {
        console.log('<LOG> - DELETE /users/places - SUCCESS');
        res.status(globals.status_codes.OK).json();
      } else {
        globals.log_msg('DELETE /users/places - query ERROR');
        res.status(globals.status_codes.Bad_Request).json();
      }
    });
  } else {
    console.error('missing arguments id');
    res.status(globals.status_codes.Bad_Request).json();
  }
});

router.post('/', (req, res) => {
  globals.log_msg('POST /user/places/add - Invoke');

  const {
    name,
    street,
    neighborhood,
    operator,
    handicapped,
    condition,
    type,
  } = req.body;

  if (name === undefined
        || neighborhood === undefined
        || operator === undefined
        || handicapped === undefined
        || type === undefined
        || condition === undefined) {
    globals.log_msg('POST /places/add - At least 1 field is missing');
    res.status(globals.status_codes.Bad_Request).json();
    return;
  }
  if (typeof (name) !== 'string'
        || typeof (neighborhood) !== 'string'
        || typeof (operator) !== 'string'
        || typeof (type) !== 'number'
        || (typeof (handicapped) !== 'boolean' && typeof (handicapped) !== 'number')
        || typeof (condition) !== 'number') {
    globals.log_msg('POST /places/add - Error with type of at least 1 input field');
    res.status(globals.status_codes.Bad_Request).json();
  } else {
    const place = {
      type: globals.places_types.dog_park,
      name,
      neighborhood,
      operator,
      handicapped,
      condition,
    };
    if (street !== undefined) {
      place.street = street;
    } else {
      place.street = '';
    }

    db.query('INSERT INTO places SET ?', place, (err, inserted_row) => {
      if (err) {
        globals.log_msg('POST /user/places/add - ERROR');
        console.error(err);
        res.status(globals.status_codes.Server_Error).json();
      } else {
        globals.log_msg('POST /user/places/add - SUCCESS');
        res.status(globals.status_codes.OK).json();
      }
    });
  }
});

router.patch('/', (req, res) => {
  globals.log_msg('UPDATE /user/places - Invoke');
  const {
    id,
    name,
    street,
    neighborhood,
    operator,
    handicapped,
    condition,
    active,
    type,
  } = req.body;

  if (name == undefined
        || street == undefined
        || neighborhood == undefined
        || operator == undefined
        || handicapped == undefined
        || condition == undefined
        || type == undefined
        || active == undefined) {
    globals.log_msg('UPDATE /user/places - At least 1 field is missing');
    res.status(globals.status_codes.Bad_Request).json();
    return;
  }

  if (typeof (name) !== 'string'
         || typeof (street) !== 'string'
         || typeof (neighborhood) !== 'string'
         || typeof (operator) !== 'string'
         || (typeof (handicapped) !== 'boolean' && typeof (handicapped) !== 'number')
         || typeof (condition) !== 'number'
         || typeof (type) !== 'number'
         || (typeof (active) !== 'boolean' && typeof (active) !== 'number')) {
    globals.log_msg('UPDATE /user/places - Error with type of at least 1 input field');
    res.status(globals.status_codes.Bad_Request).json();
    return;
  }

  const place = {
    id,
    name,
    street,
    neighborhood,
    operator,
    handicapped,
    condition,
    type,
    active,
  };

  db.query('UPDATE places SET ? WHERE id = ?', [place, place.id], (err, update_result) => {
    if (err) {
      globals.log_msg('PATCH /user/places - ERROR');
      console.error(err);
      res.status(globals.status_codes.Server_Error).json();
    } else {
      globals.log_msg('PATCH /user/places - SUCCESS');
      res.status(globals.status_codes.OK).json();
    }
  });
});

module.exports = router;
