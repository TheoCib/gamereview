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
    title:{type: Sequelize.STRING},
    content:{type: Sequelize.STRING}
});

const Vote = db.define('vote', {
    action: {type: Sequelize.ENUM('up','down')}
});

Post.hasMany(Vote);
Vote.belongsTo(Post);
Post.sync();
Vote.sync();
/*
app.get('/',(request, response) => {
    Post
        .findAll({include: [Vote]})
        .then(posts => response.render("home", {posts}));

});

*/
app.get('/', (req,res) => {
    res.render("home");
})
app.listen(3000);

