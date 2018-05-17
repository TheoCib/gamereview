const express = require('express');
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

//configuarations
const COOKIE_SECRET = 'cookie secret';
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'pug');
app.use(express.static("public"));
app.use(cookieParser(COOKIE_SECRET));
app.use(session({
    secret: COOKIE_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

//Strategie d'authentification via email + password
passport.use(new LocalStrategy((email, password, done) =>{
    User
        .findOne({where:{
                email
            }})
        .then(function (user) {
            if (!user || user.password !== password){
                return done(null, false, {
                    message: 'Email inconnue ou mdp invalide'
                });
            }
            return done(null,user)
        })
        .catch(done);
}));

passport.serializeUser((user, cb) => {
    cb(null, user.email);
});
passport.deserializeUser((email, cb) => {
    User.findOne({where:{email}})
        .then((user)=>{
            cb(null,user)
        })
});

//Que faire si les données sont justes/fausses
app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

//Se deconnecter
app.get('/api/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

//Initialisation des BDD
const db = new Sequelize('gamereview', 'root', '', {
    host: 'localhost',
    dialect: 'mysql'
});

const User = db.define('user', {
    firstname: { type: Sequelize.STRING },
    lastname: { type: Sequelize.STRING },
    email: { type: Sequelize.STRING },
    password: { type: Sequelize.STRING }
});

const Post = db.define('post', {
    title: {type: Sequelize.STRING},
    content: {type: Sequelize.TEXT},
    grade: {type: Sequelize.TINYINT},
},{
    //recupère le score selon les up et down
    getterMethods: {
        score() {
            return this.getDataValue('votes').reduce((total, vote) => {
                if (vote.action === 'up') {
                    return total + 1;
                }

                if (vote.action === 'down') {
                    return total - 1;
                }

                return total;
            },
                0);
        },
    }

});

const Vote = db.define('vote', {
    action: {type: Sequelize.ENUM('up','down')}
});

const Comment = db.define('comment', {
   comContent: {type: Sequelize.TEXT}
});

Post.hasMany(Vote);
Vote.belongsTo(Post);
Post.hasMany(Comment)
Comment.belongsTo(Post);
Post.sync();
Vote.sync();
Comment.sync();
User.sync();

//Routes
//Page principale
app.get('/',(req, res) => {
    Post
        .findAll({include: [Vote]})
        .then(posts => res.render("home", {posts, user: req.user}));

});

//Page ajouter post
app.get('/addpost', (req,res) => {
    res.render("addpost", {user: req.user})
});

//Page detail
app.get('/detail/:postId', (req,res) => {
    const postId = req.params.postId;
    Post
        .findOne({ include: [Vote, Comment], where:{
            id: postId
            }})
        .then((post) => {
            res.render("detail", { post, user: req.user })
        })
});

//page inscription
app.get('/signup' ,(req,res) => {
    res.render("signup")
});

//Page connexion, on passe
app.get('/login' ,(req,res) => {
    res.render("login", {user: req.user})
});

//Add une review dans la BDD
app.post('/addpost', (req,res) => {
   Post
       .sync()
       .then(() => {
           Post.create({
               title: req.body.title,
               content: req.body.content,
               grade: req.body.grade
           })
       })
       .then(() => {
           res.redirect('/')
       })
});

//bouton like
app.post('/api/post/:postId/like', (req,res) =>{
    Vote
        .create({action: 'up', postId: req.params.postId})
        .then (() => res.redirect('/'))
});

//bouton dislike
app.post('/api/post/:postId/dislike', (req,res) =>{
    Vote
        .create({action: 'down', postId: req.params.postId})
        .then (() => res.redirect('/'))
});

//bouton comment (dans detail)
app.post('/detail/:postId', (req,res) =>{
    Comment
        .sync()
        .then(() => {
            Comment.create({
                comContent: req.body.comment,
                postId: req.params.postId
                }
            )
        })
        .then(() => res.redirect('/detail/' + req.params.postId))
});

//Inscription, mise en BDD d'un user
app.post('/signup', (req,res) => {
    User
        .sync()
        .then(() => {
            User.create({
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    email: req.body.email,
                    password: req.body.password
                }
            )
        })
        .then(()=>{
                    res.redirect('/')
                })
});


app.listen(3000);

