/**
 * Authorization functions, used by passport.js. Feature not implemented yet, at a bit of a stand still.
 */

const verify = (request, accessToken, refreshToken, profile, done) => {
    if (profile.email.includes('@ucsd.edu') === false) {
        return done(null, false, {message: 'Not a UCSD email'})
    }
    return done(null, profile);
}

const serializeUser = (user, done) => {
    return done(null, user)
}

const deserializeUser = (user, done) => {
    return done(null, user)
}

module.exports = {verify, serializeUser, deserializeUser};