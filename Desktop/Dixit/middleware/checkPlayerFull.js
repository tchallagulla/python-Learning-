module.exports = async (req, res, next) => {
    if (!req.body.player) {
        return res.status(403).send({
            ok: false,
            error: {
                reason: 'No player data provided',
            }
        })
    }
    if (!req.body.player.username) {
        return res.status(403).send({
            ok: false,
            error: {
                reason: 'No username provided',
            }
        })
    }
    if (!req.body.player.avatarSrc) {
        return res.status(403).send({
            ok: false,
            error: {
                reason: 'No avatar provided',
            }
        })
    }
    req.player = {
        username: req.body.player.username,
        avatarSrc: req.body.player.avatarSrc,
    }
    return next();
}