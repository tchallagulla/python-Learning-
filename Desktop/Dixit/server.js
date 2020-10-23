const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const logger = require('morgan');
const path = require('path');
const socket = require('socket.io');
const { joinGame, storytellerChoose, playerChoose, playerVote, storytellerConfirm, startGame, reconnectGame } = require('./services/rooms');
const rooms = require('./routes/rooms');
const Game = require('./models/Game');
require('dotenv/config');

const port = process.env.PORT || 4000;
const app = express();

app.use(bodyParser.json());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'client/build')));

app.use('/rooms', rooms);

// Error handler
app.use('/rooms/*', (req, res) => {
  console.log('end');
  console.log(res.data);
  if (!res.data) {
      return res.status(404).send({
          ok: false,
          error: {
              reason: 'Invalid Endpoint',
              code: 404
          }
      });
  };
  if (res.data.err) {
      return res.status(res.data.status || 400).send({
          ok: false,
          error: {
              reason: res.data.err,
              code: res.data.status || 400
          }
      });
  };
  return res.status(res.data.status || 200).send({
      ok: true,
      response: res.data
  })
});

app.get('*', (req, res) => { 
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

const server = app.listen(port, () => console.log(`
Started server on http://localhost:${port}
`));

// Sockets part
const io = socket(server);
io.on('connection', socket => {
    console.log('New Connection');
    socket.emit('message', 'welcome');
    socket.on('joinRoom', async ({ player, gameId, isHost }) => {
        if (!player) socket.emit('error', 'no player object');
        if (!gameId) socket.emit('error', 'no game id');
        try {
            const { err, game } = await joinGame(player, gameId, isHost);
            if (!game) {
                socket.emit('error', err);
            } else {
                socket.join(gameId);
                io.to(gameId).emit('game', game);
            }
        } catch (err) {
            socket.emit('error', err);
        }
    });
    socket.on('reconnectRoom', async ({ username, gameId}) => {
        if (!username) socket.emit('error', 'no username');
        if (!gameId) socket.emit('error', 'no game id');
        const { err, game } = await reconnectGame(username, gameId);
        if (!game) {
            socket.emit('error', err);
        } else {
            socket.join(gameId);
            io.to(gameId).emit('game', game);
        }
    });
    socket.on('startGame', async ({ gameId }) => {
        await startGame(gameId);
        io.to(gameId).emit('game', await Game.findOne({ gameId }));
    })
    socket.on('storytellerChoose', async ({ gameId, card, clue }) => {
        const game = await Game.findOne({ gameId });
        await storytellerChoose(game, card, clue);
        io.to(gameId).emit('game', await Game.findOne({ gameId }));
    });
    socket.on('playerChoose', async ({ gameId, card, username }) => {
        const game = await Game.findOne({ gameId });
        await playerChoose(game, card, username);
        io.to(gameId).emit('game', await Game.findOne({ gameId }));
    });
    socket.on('playerVote', async ({ gameId, card, username }) => {
        const game = await Game.findOne({ gameId });
        await playerVote(game, card, username);
        io.to(gameId).emit('game', await Game.findOne({ gameId }));
    });
    socket.on('storytellerConfirm', async ({ gameId }) => {
        const game = await Game.findOne({ gameId });
        await storytellerConfirm(game);
        io.to(gameId).emit('game', await Game.findOne({ gameId }));
    })

    socket.on('error', err => console.log(err));
    socket.on('disconnect', () => {
        console.log('Closed connection');
    });
});

mongoose.connect(
  process.env.DB_CONNECTION,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err) => console.log(err ? err.message : 'Connected to Database successfully!')
);