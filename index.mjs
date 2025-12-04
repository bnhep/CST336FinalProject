import express from 'express';
import mysql from 'mysql2/promise';
import fetch from 'node-fetch';
import bcrypt from 'bcrypt';
import session from 'express-session';

//setting up express and ejs
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));

//for Express to get values using POST method
app.use(express.urlencoded({extended:true}));

//setting up sessions
app.set('trust proxy', 1);
app.use(session({
   secret: 'keyboard cat',
   resave: false,
   saveUninitialized: true,
   cookie: { maxAge: 1000 * 60 * 60 }
}))

//setting up database connection pool
const pool = mysql.createPool({
    host: "d13xat1hwxt21t45.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "x60npzp010yduc9z",
    password: "e4hohaoatagh1nhc",
    database: "dedgp2co8i984y86",
    connectionLimit: 10,
    waitForConnections: true
});
const conn = await pool.getConnection();

//functions
function isAuthenticated(req, res, next) {
   if (!req.session.authenticated) {
      res.redirect('/login');
   } else {
      next();
   }
}

//Sends the {user: username} to all templates if a user exist via the login match
app.use((req, res, next) => {
   res.locals.user = req.session.user || null; //user available in all templates
   next();
});

app.use((req, res, next) => {
   res.locals.page = null;
   next();
});

/********** ROUTES GO HERE ***************/
//General route(anyone can use)
app.get("/", (req, res) => {
  res.render("index");
});

app.get('/login', (req, res) => {
   res.render('login');
});

//home page
app.get('/home', (req, res) => {
   res.render('index');
});

// about page
app.get('/about', (req, res) => {
   res.render('about');
});

// cryptids page
app.get('/cryptids', (req, res) => {
   res.render('cryptids');
});

// sightings page
app.get('/sightings', (req, res) => {
   res.render('sightings');
});

app.get("/signup", (req, res) => {
   res.render('signup', {page:"signup"});
});

app.post('/login', async (req, res) => {
   let username = req.body.username;
   let password = req.body.password;

   let sql = `SELECT * FROM admin WHERE username = ?`;
   const [rows] = await conn.query(sql, [username]);

   // User not found
   if (rows.length === 0) {
      return res.redirect('/login'); 
   }

   let passwordHash = rows[0].password;

   let match = await bcrypt.compare(password, passwordHash);

   if (match) {
      req.session.authenticated = true;
      req.session.user = {user: username};
      res.redirect('/welcome');
   } else {
      res.redirect('/login');
   }
});

//Authenticated routes here(needs to have isAuthenticated)
app.get('/welcome', isAuthenticated, (req, res) => {
   res.render('welcome')
});

app.get('/logout', isAuthenticated, (req, res) => {
   req.session.destroy();
   res.redirect('/');
});

app.get('/profile', isAuthenticated, (req, res) => {
   res.render('profile')
});
/*****************************************/



//DB TEST
app.get("/dbTest", async(req, res) => {
   try {
        const [rows] = await pool.query("SELECT CURDATE()");
        res.send(rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error");
    }
});


app.listen(3000, () => {
   console.log('server started');
});
