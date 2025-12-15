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
      //maintains the current url of the authenticated page
      //so when a user signs in it goes back to that page
      req.session.returnTo = req.originalUrl;
      
      req.session.loginMessage = "Please sign in to continue.";
      return res.redirect('/login');
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

app.get('/login', (req, res) => {
   //req.session.loginMessage is created in isAuthenticated function
   //handles authenticated page logins otherwise there is no message aka default login is blank
   const message = req.session.loginMessage;
   delete req.session.loginMessage;

   res.render('login', {
      message: message || null,
      returnTo: req.session.returnTo || null
   });
});

//General route(anyone can use) also home page
app.get("/", (req, res) => {
   res.render("index");
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

// rubric page
app.get("/rubric", (req, res) => {
   res.render("rubric");
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
      return res.render('login', {error: 'Username not found.'});
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
   const returnTo = req.session.returnTo;
   req.session.regenerate((err) => {
      if (err) throw err;
      req.session.authenticated = true;
      req.session.user = {
            id: user.userId,
            user: user.username,
            role: user.role,
            avatar: user.avatar_url
      };
   res.redirect(returnTo || '/welcome');
   });

});

app.post('/signup', async (req, res) => {
   try {
      //get the contents of the POST
      let {username, email, password, confirmPassword, firstname, lastname, avatar_url} = req.body;
      console.log(avatar_url);
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
         return res.render('signup', {error: 'Username already taken.'});
      }

      //hash the password to insert to database
      let passwordHash = await bcrypt.hash(password, 10);
      let insertSQL = `INSERT INTO users 
                       (username, email, password, first_name, last_name, avatar_url)
                       VALUES (?, ?, ?, ?, ?, ?)`;
      const [insertRow] = await conn.query(insertSQL, [username, email, passwordHash, firstname || null, lastname || null, avatar_url || null]);
      //create the sessions for a new user
      req.session.regenerate((err) => {
         if (err) throw err;
         req.session.authenticated = true;
         req.session.user = {
               id: insertRow.insertId,
               user: username,
               role: 'user',
               avatar: avatar_url
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

app.get('/profile', isAuthenticated, async (req, res) => {
   let profileSQL = `SELECT username, email, first_name, last_name, bio, avatar_url, contact, created_at
                     FROM users
                     WHERE userId = ?`;
   const [rows] = await conn.query(profileSQL,[req.session.user.id])
   res.render('profile', {profile:rows, message: req.session.message, error: req.session.error})
   req.session.message = null;
   req.session.error = null;
});

app.get('/profile/edit', isAuthenticated, async (req, res) => {
   let profileSQL = `SELECT username, email, first_name, last_name, bio, avatar_url, contact, created_at
                     FROM users
                     WHERE userId = ?`;
   const [rows] = await conn.query(profileSQL,[req.session.user.id])
   res.render('editprofile', {profile: rows })
});

//post of profile edit
app.post('/profile/edit', async (req, res) => {
   try {
      let { first_name, last_name, email, contact, bio, avatar_url } = req.body;

      let sql = `UPDATE users 
                  SET first_name = ?, 
                  last_name = ?, 
                  email = ?, 
                  contact = ?, 
                  bio = ?, 
                  avatar_url = ?
                  WHERE userId = ?`;
      const [rows] = await conn.query(sql, [first_name, last_name, email, contact, bio, avatar_url, req.session.user.id]);
      req.session.user.avatar = avatar_url;
      // Store a success message in session
      req.session.message = "Profile has been updated successfully.";

      // Redirect back to profile route
      res.redirect('/profile');
   } catch (err) {
      console.error(err);
      req.session.error = "Something went wrong updating your profile.";
      res.redirect('/profile/edit');
   }
});

/*****************************************/

/*******APIS CAN GO HERE*************/
app.get('/api/avatars', async (req, res) => {
   let avatars = `SELECT *
                  FROM avatars`;
   const [rows] = await conn.query(avatars)
   res.send(rows);
});

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
