const mongoose = require('mongoose');

const playerSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    avatarSrc: {
        type: String,
        required: true,
    },
    currentRole: {
        type: String,
        enum: ['storyteller', 'player'],
        required: true,
        default: 'player',
    },
    score: {
        type: Number,
        required: true,
        default: 0,
    },
    isHost: {
        type: Boolean,
        required: true,
        default: false,
    },
    cards: [{
        type: Number,
    }],
    chosenCard: {
        type: Number,
        required: false,
    }
});

const gameSchema = mongoose.Schema({
    isPublic: {
        type: Boolean,
        required: true,
    },
    state: {
        type: String,
        required: true,
        enum: ['not started', 'storyteller', 'choosing', 'voting', 'votingEnd', 'finished'],
        default: 'not started',
    },
    gameId: {
        type: String,
        required: true,
        unique: true,
    },
    players: [playerSchema],
    cards: [{
        type: Number,
    }],
    votings: [Number],
    scores: [Number],
    clue: {
        type: String,
        required: false,
    },
    winner: {
        type: Number,
        required: false,
    }
});

gameSchema.pre('validate', async function (next) {
    function hasDuplicates(array) {
        return (new Set(array)).size !== array.length;
    }
    if (this.state !== 'not started' && 
    !this.players.map(player => player.isHost).includes(true)) {
        return next(new Error(`No host found in this game`));
    }
    if (hasDuplicates(this.players.map(player => player.username))) {
        return next(new Error(`This game has duplicate username`));
    }
    const roles = this.players.map(player => player.currentRole);
    if (this.state !== 'not started' && roles.filter(i => i === 'storyteller').length !== 1) {
        return next(new Error(`Must be one storyteller`));
    }
    if (this.state !== 'not started' && this.players.length < 3) {
        return next(new Error(`Not enough players to start a game (must be at least 3)`));
    }
    if (this.players.length > 6) {
        return next(new Error(`Too many players (max: 6)`));
    }
    return next();
})

module.exports = Game = mongoose.model('room', gameSchema);