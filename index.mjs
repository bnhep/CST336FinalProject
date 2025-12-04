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
   saveUninitialized: true
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

//function to authenticate certain routes
function isAuthenticated(req, res, next) {
   if (!req.session.authenticated) {
      res.redirect('/login');
   } else {
      next();
   }
}

//function to authenticate certain routes(if ADMIN)
function adminOnly(req, res, next) {
   if (req.session.user && req.session.user.role === 'admin') {
      return next();
   }
   res.status(403).send('Access denied');
}

//Sends the {user: username} to all templates if a user exist via the login match
app.use((req, res, next) => {
   res.locals.user = req.session.user || null; //user available in all templates
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
app.get('/sightings', isAuthenticated, (req, res) => {
   res.render('sightings');
});

app.get("/signup", (req, res) => {
   res.render('signup', {page:"signup"});
});

app.post('/login', async (req, res) => {
   //get the contents of the POST
   let username = req.body.username;
   let password = req.body.password;

   //gets the username
   let sql = `SELECT * 
               FROM users 
               WHERE username = ?`;
   const [rows] = await conn.query(sql, [username]);

   //username existence validation
   if (rows.length === 0) {
      return res.render('login', {error: 'Username not found. Please sign up first.'});
   }

   //if user exists get user contents
   let user = rows[0];
   let passwordHash = rows[0].password;

   //check password match using bcrpyt
   let match = await bcrypt.compare(password, passwordHash);

   if (!match) {
      return res.render('login', {error: 'Incorrect password.'});
   }
   
   //create a session for the user if succesful login
   if (match) {
      req.session.regenerate((err) => {
         if (err) throw err;
         req.session.authenticated = true;
         req.session.user = {
               id: user.userId,
               user: user.username,
               role: user.role
         };
         res.redirect('/welcome');
      });
   } else {
      return res.render('login', {error: 'Incorrect password.'});
   }
});

app.post('/signup', async (req, res) => {
   try {
      //get the contents of the POST
      let {username, email, password, confirmPassword, firstname, lastname} = req.body;

      //handle confirm password validation
      if (password !== confirmPassword) {
         return res.render('signup', {error: 'Passwords do not match.'});
      }

      //handle username check validation
      let sql = `SELECT * 
                  FROM users 
                  WHERE username = ?`;
      const [rows] = await conn.query(sql, [username]);

      if (rows.length > 0) {
         return res.render('signup', {error:  'Username already taken.'});
      }

      //hash the password to insert to database
      let passwordHash = await bcrypt.hash(password, 10);

      let insertSQL = `INSERT INTO users 
                       (username, email, password, first_name, last_name)
                       VALUES (?, ?, ?, ?, ?)`;
      const [insertRow] = await conn.query(insertSQL, [username, email, passwordHash, firstname || null, lastname || null]);

      //create the sessions for a new user
      req.session.regenerate((err) => {
         if (err) throw err;
         req.session.authenticated = true;
         req.session.user = {
               id: insertRow.insertId,
               user: username,
               role: 'user'
         };
         res.redirect('/welcome');
      });

   } catch (err) {
      console.error(err);
      res.render('signup', { error: 'An error occurred. Please try again.' });
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
