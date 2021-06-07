const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const globals = require('./globals');
const http = require("http");

globals.mode = 'debug';
const API = require('./routes/api');

const app = express();
const port = globals.server_port;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', API);

// app.all('*', (req, res) => {
//   res.status(globals.status_codes.Not_Found).json();
// });

module.exports = http.createServer(app).listen(port, "0.0.0.0", () => {
    console.log(`HTTP server is running on port ${port}`);
})	

 // = app.listen(5050, "0.0.0.0", () => globals.log_msg(`Find Treasure Server Side listening at http://localhost:${port}`));
