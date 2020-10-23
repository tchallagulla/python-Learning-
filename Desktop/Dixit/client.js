const io = require('socket.io-client');
const socket = io('http://localhost:4000');



socket.on('connect', () => {
    socket.emit('joinRoom', {
        player: {
            username: 'Fullfix',
            avatarSrc: 'avatar',
        },
        gameId: 'newGame',
        isHost: true,
    });
});
socket.on('message', msg => console.log(msg));
socket.on('game', game => {
    console.log('GAME OBJECT RECEIVED');
    console.log(game);
})
socket.on('error', err => console.log(err));