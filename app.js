require('dotenv').config()
const express = require('express')
const app = express()
const path = require('path')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcryptjs')
const { name } = require('ejs')
const pool = require('./db/pool')
const pgSession = require('connect-pg-simple')(session);
const { body, validationResult } = require('express-validator')
const { signupValidators, vipValidators } = require('./utils/formValidation')

const assetsPath = path.join(__dirname, "public")
app.use(express.static(assetsPath))

app.use(express.urlencoded({ extended: true }))

app.set('view engine', 'ejs')

app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(passport.session());


app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});

app.get('/', (req, res) => {
    res.render('index')
})
app.get('/sign-up', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    } 

    const formData = req.session.formData || {}
    req.session.formData = null
    res.render('sign-up', {
        username: formData.username,
        first: formData.first,
        last: formData.last,
        error: formData.error
    })
})

app.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    } 
        res.render('login')
})

app.get('/vip-form', (req, res) => {
    if(!req.isAuthenticated){
        return res.redirect('/')
    }

    res.render('vip-access')
})

app.post('/vip-form', vipValidators, (req, res) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()) {
        return res.status(400).render('vip-access', {
            errors: errors.array()
        })
    }
})

app.post("/sign-up", signupValidators, async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('sign-up', { 
            username: req.body.username,
            first: req.body.first,
            last: req.body.last,
            errors: errors.array() });
    }

    bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
        if (err) {
            return next(err)
        } else {
            try {
                await pool.query("INSERT INTO users (firstname, lastname, username, password) VALUES ($1, $2, $3, $4)", [
                    req.body.first,
                    req.body.last,
                    req.body.username,
                    hashedPassword,
                ]);
                res.redirect("/");
            } catch (err) {
                if (err.code === '23505') {
                    req.session.formData = {
                        username: req.body.username,
                        first: req.body.first,
                        last: req.body.last,
                        error: "Username already taken"
                    }
                    res.redirect('/sign-up')
                } else {
                    return next(err);
                }


            }
        }
    });

});

app.post(
    "/login",
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/"
    })
);

app.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
            const user = rows[0];

            if (!user) {
                return done(null, false, { message: "Incorrect username" });
            }
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                // passwords do not match!
                return done(null, false, { message: "Incorrect password" })
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    })
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
        const user = rows[0];

        done(null, user);
    } catch (err) {
        done(err);
    }
});

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Listening to port ${PORT}`)
})