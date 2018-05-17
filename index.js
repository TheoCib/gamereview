const express = require('express');
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
const app = express();

app.set('view engine', 'pug');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

//Initialisation des BDD
const db = new Sequelize('gamereview', 'root', '', {
    host: 'localhost',
    dialect: 'mysql'
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

//Routes
app.get('/',(request, response) => {
    Post
        .findAll({include: [Vote]})
        .then(posts => response.render("home", {posts}));

});

app.get('/addpost', (req,res) => {
    res.render("addpost")
});

app.get('/detail/:postId', (req,res) => {
    const postId = req.params.postId;
    Post
        .findOne({ include: [Vote, Comment], where:{
            id: postId
            }})
        .then((post) => {
            res.render("detail", { post })
        })
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


app.listen(3000);

