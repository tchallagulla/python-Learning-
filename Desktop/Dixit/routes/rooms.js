const express = require('express');
const Game = require('../models/Game');
const checkPlayerFull = require('../middleware/checkPlayerFull');

const router = express.Router();

router.post('/create', async (req, res, next) => {
    console.log('BODY');
    console.log(req.body);
    if (!req.body.gameId) {
        res.data = { err: 'Game Id not provided' };
        return next();
    }
    try {
        const cards = [];
        for (let i=1; i<85; i++) {
            cards.push(i);
        }
        const game = new Game({
            isPublic: !!req.body.isPublic,
            gameId: req.body.gameId,
            players: [],
            cards,
        });
        const newGame = await game.save();
        res.data = newGame;
        return next();
    } catch (err) {
        res.data = { err: err.errmsg || err.message };
        return next();
    }
});

router.get('/open', async (req, res, next) => {
    const games = await Game.find({ isPublic: true, state: 'not started' });
    res.data = games;
    return next();
})

module.exports = router;