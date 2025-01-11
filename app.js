require('dotenv').config()
const express = require('express')
const app = express()
const path = require('path')
const session = require('express-session')
const bcrypt = require('bcryptjs')
const { name } = require('ejs')
const pool = require('./db/pool')
const pgSession = require('connect-pg-simple')(session);
const { body, validationResult } = require('express-validator')
const { signupValidators, vipValidators } = require('./utils/formValidation')
const { grantVip, writeMessage, getMessages, deleteMessage } = require('./db/queries/queries')
const { isAuth, isVip, isAdmin } = require('./utils/authMiddleware')
const passport = require('./passportConfig')

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
    res.locals.currentUser = req.user || null;
    next();
});

app.use((req, res, next) => {
    res.locals.errorMessage = req.session.errorMessage || null;
    req.session.errorMessage = null;
    next();
});

app.get('/', async(req, res) => {
    const messages = await getMessages()

    res.render('index', { messages })
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

app.get('/admin', isAdmin, (req, res) => {
    res.render('admin')
})

app.get('/mirror', async(req, res) => {
    if(!req.isAuthenticated()){
        return res.redirect('/')
    }

    const messages = await getMessages()

    res.render('mirror', { messages })
})

app.post('/mirror', async(req, res) => {
    if(!req.isAuthenticated()){
        return res.redirect('/')
    }

    const { message } = req.body

    await writeMessage(req.user.id, message)

    res.redirect('/mirror')
})

app.post('/mirror/:messageId/delete', isAdmin, async(req, res) => {

    await deleteMessage(req.params.messageId)

    res.redirect('/mirror')
})

app.get('/vip-form', (req, res) => {
    if(!req.isAuthenticated()){
        return res.redirect('/')
    }
    res.render('vip-access')
})

app.post('/vip-form', vipValidators, async(req, res) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()) {
        return res.status(400).render('vip-access', {
            errors: errors.array()
        })
    }

    await grantVip(req.user.id)
    res.redirect('/vip-form')
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

app.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.session.errorMessage = info.message;
            return res.redirect("/login");
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            return res.redirect("/");
        });
    })(req, res, next);
});

app.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Listening to port ${PORT}`)
})