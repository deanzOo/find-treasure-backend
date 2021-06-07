module.exports = {
  user_types: {
    admin: 0,
    dogOwner: 1,
    businessOwner: 2,
  },
  server_port: process.env.PORT || 3000,
  DB: {
    HOST: 'localhost',
    PORT: 3306,
    USER: '',
    PASS: '',
    NAME: 'find_treasure',
  },
  log_func: function Log(req, res, next) {
    if (this.mode === 'debug') { console.log('<LOG> - ', new Date().toUTCString()); }
    next();
  },
  log_msg: function LogMsg(msg) {
    if (this.mode === 'debug') { console.log(`<LOG> - ${msg}`); }
  },
  places_types: {
    dog_park: 0,
    Historic_Parks: 1,
    Cafewithdog: 2,
    NationalParks: 3,
  },
  status_codes: {
    OK: 200,
    Created: 201,
    Accepted: 202,
    No_Content: 204,
    Bad_Request: 400,
    Unauthorized: 401,
    Forbidden: 403,
    Not_Found: 404,
    Server_Error: 500,
  },
  aws: {

  },
  mode: 'debug',
};
