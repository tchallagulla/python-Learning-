const Game = require('../models/Game');

exports.joinGame = async (player, gameId, isHost=false) => {
    if (!gameId) {
        return { err: 'No gameId' }
    }
    try {
        const game = await Game.findOne({ gameId });
        const inGame = game.players
        .filter(p => p.username === player.username).length === 1;
        if (!game) {
            return { err: 'Game with this id does not exist' };
        }
        if (game.state !== 'not started' && !inGame) {
            return { err: 'Game has already started' };
        }
        if (!game.players.map(player => player.username).includes(player.username)) {
            game.players.push({
                ...player,
                isHost: isHost,
            });
        }
        const newGame = await game.save();
        return { ok: true, game: newGame };
    } catch (err) {
        return { err };
    }
}

exports.reconnectGame = async (username, gameId) => {
    if (!gameId) {
        return { err: 'No gameId' }
    }
    try {
        const game = await Game.findOne({ gameId });
        const inGame = game.players
        .filter(p => p.username === username).length === 1;
        if (!game) {
            return { err: 'Game with this id does not exist' };
        }
        if (!inGame) {
            return { err: 'Not in game' };
        }
        return { ok: true, game };
    } catch (err) {
        return { err };
    }
}

const initializeGame = async (game) => {
    for (let player of game.players) {
        for (let i=0; i<=5; i++) {
            let card = game.cards[Math.floor(Math.random() * game.cards.length)];
            player.cards.push(card);
            game.cards = game.cards.filter(c => c !== card);
        }
    }
    await game.save();
}

const nextStoryteller = async (game) => {
    game.state = 'storyteller';
    let storyteller;
    for (let i in game.players) {
        if (game.players[i].currentRole === 'storyteller') {
            storyteller = i;
            game.players[i].currentRole = 'player';
        }
    }
    if (!storyteller) storyteller = game.players.length - 1;
    storyteller = (storyteller + 1) % game.players.length;
    game.players[storyteller].currentRole = 'storyteller';
    await game.save();
}

exports.storytellerChoose = async (game, card, clue) => {
    for (let i in game.players) {
        if (game.players[i].currentRole === 'storyteller') {
            game.players[i].chosenCard = card;
        } else {
            game.players[i].chosenCard = null;
        }
    }
    game.clue = clue;
    game.state = 'choosing';
    await game.save();
}

exports.playerChoose = async (game, card, username) => {
    const votings = game.players.map(player => null);
    for (let i in game.players) {
        if (game.players[i].username === username) {
            game.players[i].chosenCard = card;
            votings[i] = game.players[i].chosenCard;
        } else {
            if (game.players[i].chosenCard) {
                votings[i] = game.players[i].chosenCard;
            }
        }
    }
    if (votings.filter(voting => !!voting).length === game.players.length) {
        game.state = 'voting';
        game.votings = votings;
        for (let i in game.players) {
            if (game.players[i].currentRole !== 'storyteller') {
                game.players[i].chosenCard = null;
            }
        }
    }
    await game.save();
}

exports.playerVote = async (game, card, username) => {
    const votings = game.players.map(player => null);
    for (let i in game.players) {
        if (game.players[i].username === username) {
            game.players[i].chosenCard = card;
            votings[i] = game.players[i].chosenCard;
        } else {
            if (game.players[i].chosenCard) {
                votings[i] = game.players[i].chosenCard;
            }
        }
    }
    if (votings.filter(voting => !!voting).length === game.players.length) {
        const scores = getScoring(game);
        const scoresAr = Array(game.players.length);
        for (let i in game.players) {
            scoresAr[i] = scores[game.players[i].username];
        }
        game.state = 'votingEnd';
        // CLEAR cards
        for (let i in game.players) {
            game.players[i].cards = game.players[i].cards.filter(c => c !== game.votings[i]);
        }
        game.scores = scoresAr;
    }
    await game.save();
}

exports.storytellerConfirm = async (game) => {
    for (let i in game.players) {
        game.players[i].score += game.scores[i];
    }
    game.scores = [];
    game.votings = [];
    const maxScore = Math.max(...game.players.map(player => player.score));
    if (maxScore >= 30 || game.cards.length < game.players.length) {
        for (let i in game.players) {
            if (game.players[i].score === maxScore) {
                game.winner = i;
                game.state = 'finished';
                break;
            }
        }
    } else {
        for (let i in game.players) {
            let card = game.cards[Math.floor(Math.random() * game.cards.length)];
            game.players[i].cards.push(card);
            game.cards = game.cards.filter(c => c !== card);
        }
        await nextStoryteller(game);
    }
    await game.save();
}

const getScoring = (game) => {
    const scores = {};
    const votes = {};
    const storyteller = game.players.find(player => player.currentRole === 'storyteller');
    game.players.forEach(player => {
        scores[player.username] = 0;
        if (player.currentRole !== storyteller) votes[player.username] = player.chosenCard;
    });
    // RULE 1
    if (Object.values(votes).filter(card => card !== storyteller.chosenCard).length === 0
    || Object.values(votes).filter(card => card === storyteller.chosenCard).length === 0) {
        for (let username of Object.keys(scores)) {
            if (username === storyteller.username) {
                scores[username] = 0;
            } else {
                scores[username] = 2;
            }
        }
        return scores;
    }
    // RULE 2
    for (let player of game.players) {
        if (player.chosenCard === storyteller.chosenCard && 
            player.currentRole !== 'storyteller') {
            scores[player.username] = 3;
            scores[storyteller.username] = 3;
        }
    }
    // RULE 3
    for (let player of game.players) {
        if (player.currentRole === 'storyteller') {
            continue;
        }
        let count = 0;
        for (let i in game.players) {
            if (
                game.votings[
                    game.players.map(p => p.username).indexOf(player.username)
                ] === game.players[i].chosenCard) {
                count++;
            }
        }
        scores[player.username] += count;
    }
    return scores;
}


exports.startGame = async (gameId) => {
    const game = await Game.findOne({ gameId });
    if (game.state === 'not started' && game.players.length >= 3) {
        await initializeGame(game);
        await nextStoryteller(game);
    }
}