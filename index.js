var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var cors = require('cors');
app.use(cors());

var server = require('http').Server(app);
var socketApi = require('./chats/chat.socket');
const config = require('./config.json');
const jwt = require('./helpers/jwt');

var io = socketApi.io;

io.attach(server, {
  cors: {
    origin: '*',
  }
});


// Start the Server
server.listen(config.port, function () {
  console.log('Server Started. Listening on *:' + config.port);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(jwt());

// Express Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
  extended: true
}));

// Render Main HTML file
app.get('/chat', (req, res) => {
  res.sendFile(__dirname + '/chat.html');
});
