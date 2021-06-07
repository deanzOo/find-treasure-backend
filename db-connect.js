const mysql = require('mysql');
const globals = require('./globals');

const connection = mysql.createConnection({
  host: globals.DB.HOST,
  port: globals.DB.PORT,
  user: globals.DB.USER,
  password: globals.DB.PASS,
  database: globals.DB.NAME,
  multipleStatements: true,
});
connection.connect(err => {
	if (err) throw err;
	console.log('Connected to Database!');
})
// console.log('connection db:', connection);

module.exports = connection;
