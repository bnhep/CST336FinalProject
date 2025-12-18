import express from 'express';
import mysql from 'mysql2/promise';
import fetch from 'node-fetch';
import bcrypt from 'bcrypt';
import session from 'express-session';

//setting up express and ejs
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());

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

//helper function for pulling specific sighting by user id
async function getSightingById(id) {
   //query db gathering sighting info by user id
   const [rows] = await conn.query(
      `
      SELECT
         s.sighting_id,
         s.userId,
         s.cryptid_id,
         s.sighting_date,
         s.description,
         s.danger_level,
         s.location_name
      FROM sightings s
      WHERE s.sighting_id = ?
      `,
      [id]
   );
   //return it or null
   return rows[0] || null;
}

//helper function for formating sql date/time for inline html
function formatDateTimeForInputs(mysqlDateTime) {
   //check for null
   if (!mysqlDateTime) {
      return { dateForInput: '', timeForInput: '' };
   }
   //check for bad input
   const d = new Date(mysqlDateTime);
   if (isNaN(d.getTime())) {
      return { dateForInput: '', timeForInput: '' };
   }

   //convert date to string
   const iso = d.toISOString();
   //cut parts off of the string
   const dateForInput = iso.slice(0, 10);  //year/month/day
   const timeForInput = iso.slice(11, 16); //hour/minute

   //return pieces
   return { dateForInput, timeForInput };
}

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

//Learn more page
app.get('/cryptid/:id', async (req, res) => {
  let cryptidId = req.params.id;
  
  let cryptidSql = 'SELECT * FROM cryptids WHERE cryptid_id = ?';
  const [cryptidRows] = await conn.query(cryptidSql, [cryptidId]);
  
  if (cryptidRows.length === 0) {
    return res.status(404).send('Cryptid not found');
  }
  
  let sightingsSql = 'SELECT * FROM sightings WHERE cryptid_id = ? ORDER BY sighting_date DESC';
  const [sightingsRows] = await conn.query(sightingsSql, [cryptidId]);
  
  res.render('learnmore', { 
    cryptid: cryptidRows[0],
    sightings: sightingsRows
  });
});

app.get('/cryptids', async (req, res) => {
   try {
      const [rows] = await conn.query(
         'select cryptid_id, name, image_url from cryptids order by name'
      );
      res.render('cryptids', { cryptids: rows });
   } catch (err) {
      console.error(err);
      res.status(500).send('Error loading cryptids.');
   }
});

// sightings page
app.get('/sightings', isAuthenticated, async (req, res) => {
   try {
      //gather info from fields
      const mode = req.query.mode || 'cryptid';
      const cryptidId = req.query.cryptid_id || '';
      const locationName = req.query.location_name || '';
      const order = req.query.order === 'oldest' ? 'oldest' : 'newest';
      const yearFrom = req.query.year_from || '';
      const yearTo = req.query.year_to || '';

      const params = [];
      let where = 'WHERE 1=1';

      //search options
      //for by cryptid
      if (mode === 'cryptid' && cryptidId) {
         where += ' AND s.cryptid_id = ?';
         params.push(cryptidId);
      }

      //for by location
      if (mode === 'location' && locationName) {
         where += ' AND s.location_name = ?';
         params.push(locationName);
      }

      //for by user
      if (mode === 'mine' && req.session.user) {
         where += ' AND s.userId = ?';
         params.push(req.session.user.id);
      }

      //start year
      if (yearFrom) {
         where += ' AND YEAR(s.sighting_date) >= ?';
         params.push(yearFrom);
      }

      //end year
      if (yearTo) {
         where += ' AND YEAR(s.sighting_date) <= ?';
         params.push(yearTo);
      }

      //build sql order
      const orderSql =
         order === 'oldest' ? 'ORDER BY s.sighting_date ASC' : 'ORDER BY s.sighting_date DESC';

      //build sql query
      const sightingsSql = `
         SELECT
            s.sighting_id,
            s.sighting_date,
            s.description,
            s.location_name,
            s.userId,
            c.name AS cryptid_name,
            u.username AS reported_by
         FROM sightings s
         JOIN cryptids c ON c.cryptid_id = s.cryptid_id
         LEFT JOIN users u ON u.userId = s.userId
         ${where}
         ${orderSql}
      `;

      //query the db and store the info
      const [sightings] = await conn.query(sightingsSql, params);

      //cryptid list dropdown
      const [cryptids] = await conn.query(
         'SELECT cryptid_id, name FROM cryptids ORDER BY name'
      );

      //years dropdown
      const [yearRows] = await conn.query(
         'SELECT DISTINCT YEAR(sighting_date) AS y FROM sightings ORDER BY y DESC'
      );
      const years = yearRows.map(r => r.y);

      //render the page and pass all the info in
      res.render('sightings', {
         sightings,
         cryptids,
         years,
         mode,
         order,
         yearFrom,
         yearTo,
         locationName,
         selectedCryptidId: cryptidId,
         error: req.session.error || null
      });

      req.session.error = null;
   } catch (err) {
      console.error(err);
      res.status(500).send('Error loading sightings.');
   }
});

//new sighting page
app.get('/sightings/new', isAuthenticated, async (req, res) => {
   try {
      //get the cryptids for the drop down
      const [cryptids] = await conn.query(
         'SELECT cryptid_id, name FROM cryptids ORDER BY name'
      );

      const message = req.session.message || null;
      const error = req.session.error || null;
      req.session.message = null;
      req.session.error = null;

      const selectedCryptidId = req.query.cryptid_id || '';

      //render and pass in info
      res.render('sightings-new', {
         cryptids,
         message,
         error,
         selectedCryptidId
      });
   } catch (err) {
      console.error(err);
      res.status(500).send('Error loading new sighting form.');
   }
});

//submitting new sighting
app.post('/sightings/new', isAuthenticated, async (req, res) => {
   try {
      //get user
      const userId = req.session.user.id;
      const {
         cryptid_id,
         location_name,
         date,
         time,
         details,
         mood //danger rating
      } = req.body;

      //make sure input exists
      if (!cryptid_id || !location_name || !date) {
         req.session.error = 'Cryptid, location, and date are required.';
         return res.redirect('/sightings/new');
      }

      //sighting datetime
      const sightingTime = time && time.trim() !== '' ? time : '00:00';
      const sightingDateTime = `${date} ${sightingTime}:00`;

      //danger level
      let dangerLevel = parseInt(mood, 10);
      if (isNaN(dangerLevel) || dangerLevel < 1 || dangerLevel > 5) {
         dangerLevel = 3;
      }

      //insert the sighting
      await conn.query(
         `INSERT INTO sightings
         (userId, cryptid_id, location_name, sighting_date, description, danger_level)
         VALUES (?, ?, ?, ?, ?, ?)`,
         [userId, cryptid_id, location_name, sightingDateTime, details || null, dangerLevel]
      );

      //update cryptid known_regions
      const [cryptidRows] = await conn.query(
         'SELECT known_regions FROM cryptids WHERE cryptid_id = ?',
         [cryptid_id]
      );

      //check regions
      if (cryptidRows.length > 0) {
         const locName = location_name.trim();
         let knownRegions = cryptidRows[0].known_regions || '';
         let shouldUpdate = false;

         if (!knownRegions.trim()) {
         //start with this location
         knownRegions = locName;
         shouldUpdate = true;
         } else {
         const regions = knownRegions
            .split(',')
            .map(r => r.trim())
            .filter(Boolean);

         const lowerSet = regions.map(r => r.toLowerCase());
         if (!lowerSet.includes(locName.toLowerCase())) {
            knownRegions = knownRegions + ', ' + locName;
            shouldUpdate = true;
         }
         }

         if (shouldUpdate) {
            await conn.query(
               'UPDATE cryptids SET known_regions = ? WHERE cryptid_id = ?',
               [knownRegions, cryptid_id]
            );
         }
      }

      res.redirect('/sightings?mode=mine');
   } catch (err) {
      console.error(err);
      req.session.error = 'There was a problem saving your sighting.';
      res.redirect('/sightings/new');
   }
});

//sightings edit page
app.get('/sightings/:id/edit', isAuthenticated, async (req, res) => {
   try {
      //get user
      const sightingId = req.params.id;
      //get sighting from user id
      const sighting = await getSightingById(sightingId);

      //null check
      if (!sighting) {
         return res.status(404).render('error', { error: 'Sighting not found.' });
      }

      //ownership check
      if (String(sighting.userId) !== String(req.session.user.id)) {
         return res.status(403).render('error', { error: 'You cannot edit this sighting.' });
      }

      //load cryptids for dropdown
      const [cryptids] = await conn.query(
         'SELECT cryptid_id, name FROM cryptids ORDER BY name'
      );

      //format the date and time
      const { 
         dateForInput, timeForInput 
      } = formatDateTimeForInputs(sighting.sighting_date);

      const message = req.session.message || null;
      const error = req.session.error || null;
      req.session.message = null;
      req.session.error = null;

      //render and pass info in
      res.render('sightings-edit', {
         cryptids,
         sighting,
         dateForInput,
         timeForInput,
         message,
         error
      });
   } catch (err) {
      console.error(err);
      res.status(500).render('error', { error: 'Error loading edit sighting form.' });
   }
});

//sightings edit submit form
app.post('/sightings/:id/edit', isAuthenticated, async (req, res) => {
   try {
      //get user
      const sightingId = req.params.id;
      //get sighting by user id
      const original = await getSightingById(sightingId);

      //null check
      if (!original) {
         return res.status(404).render('error', { error: 'Sighting not found.' });
      }

      //ownership check
      if (String(original.userId) !== String(req.session.user.id)) {
         return res.status(403).render('error', { error: 'You cannot edit this sighting.' });
      }

      const {
         cryptid_id,
         location_name,
         date,
         time,
         details,
         mood
      } = req.body;

      //make sure input exists
      if (!cryptid_id || !location_name || !date) {
         req.session.error = 'Cryptid, location, and date are required.';
         return res.redirect(`/sightings/${sightingId}/edit`);
      }

      //build datetime
      const sightingTime = time && time.trim() !== '' ? time : '00:00';
      const sightingDateTime = `${date} ${sightingTime}:00`;

      //danger level
      let dangerLevel = parseInt(mood, 10);
      if (isNaN(dangerLevel) || dangerLevel < 1 || dangerLevel > 5) {
         dangerLevel = 3;
      }

      //query sql update
      await conn.query(
         `
         UPDATE sightings
         SET
         cryptid_id = ?,
         location_name = ?,
         sighting_date = ?,
         description = ?,
         danger_level = ?
         WHERE sighting_id = ?
         `,
         [cryptid_id, location_name, sightingDateTime, details || null, dangerLevel, sightingId]
      );

      res.redirect('/sightings?mode=mine');
   } catch (err) {
      console.error(err);
      req.session.error = 'There was a problem updating your sighting.';
      res.redirect(`/sightings/${req.params.id}/edit`);
   }
});

// rubric page
app.get("/rubric", (req, res) => {
   res.render("rubric");
});

app.get("/signup", (req, res) => {
   res.render('signup', {page:"signup"});
});

app.post('/login', async (req, res) => {
   try {
      // Get the contents of the POST
      let username = req.body.username;
      let password = req.body.password;

      // Query for the username
      let sql = `SELECT *
                  FROM users
                  WHERE username = ?
               `;
      const [rows] = await conn.query(sql, [username]);

      // Username existence validation
      if (rows.length === 0) {
         return res.render('login', { error: 'Username not found.' });
      }

      // If user exists, get user contents
      let user = rows[0];
      let passwordHash = user.password;

      // Check password match using bcrypt
      let match = await bcrypt.compare(password, passwordHash);

      if (!match) {
         return res.render('login', { error: 'Incorrect password.' });
      }

      // Create a session for the user if successful login
      const returnTo = req.session.returnTo;
      req.session.regenerate((err) => {
      if (err) {
         console.error('Session regeneration failed:', err);
         return res.status(500).render('login', { error: 'Login failed. Please try again.' });
      }

      req.session.authenticated = true;
      req.session.user = {
         id: user.userId,
         user: user.username,
         role: user.role,
         avatar: user.avatar_url
      };

      res.redirect(returnTo || '/welcome');
      });
   } catch (err) {
      console.error('Error during login:', err);
      res.status(500).render('login', { error: 'An unexpected error occurred. Please try again.' });
   }
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
   try {
      let profileSQL = `SELECT username, email, first_name, last_name, bio, avatar_url, contact, created_at
                        FROM users
                        WHERE userId = ?
      `;
      const [rows] = await conn.query(profileSQL, [req.session.user.id]);

      res.render('profile', {
      profile: rows,
      message: req.session.message,
      error: req.session.error
      });

      // Clear session messages after rendering
      req.session.message = null;
      req.session.error = null;
   } catch (err) {
      console.error('Error fetching profile:', err);
      res.status(500).render('error', { error: 'Failed to load profile.' });
   }
});

app.get('/profile/edit', isAuthenticated, async (req, res) => {
   try {
      let profileSQL = `SELECT username, email, first_name, last_name, bio, avatar_url, contact, created_at
                     FROM users
                     WHERE userId = ?
      `;
      const [rows] = await conn.query(profileSQL, [req.session.user.id]);

      res.render('editprofile', { profile: rows });
   } catch (err) {
      console.error('Error fetching profile for edit:', err);
      res.status(500).render('error', { error: 'Failed to load edit profile page.' });
   }
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
      req.session.message = "Profile has been updated.";

      // Redirect back to profile route
      res.redirect('/profile');
   } catch (err) {
      console.error(err);
      req.session.error = "Something went wrong updating your profile.";
      res.redirect('/profile/edit');
   }
});

app.get("/admindashboard", isAuthenticated, adminOnly, async (req, res) => {
   try {
      let errMessage = null;
      if ((req.query.deleted === "true") && (req.query.option === "sighting")) {
         errMessage = "Sighting has been deleted.";
      }
      if ((req.query.deleted === "true") && (req.query.option === "user")) {
         errMessage = "Profile has been deleted.";
      }

      let usersSQL = `SELECT userId, username
                     FROM users
                     ORDER BY username;
                     `;
      let [usernames] = await conn.query(usersSQL);

      let sightingSQL = `SELECT sighting_id
                        FROM sightings
                        ORDER BY sighting_id;
                        `;
      let [sightings] = await conn.query(sightingSQL);

      let namesSQL = `SELECT cryptid_id, name
                     FROM cryptids
                     ORDER BY name;
                     `;
      let [cryptidNames] = await conn.query(namesSQL);

      res.render("admindashboard", {names: cryptidNames, users: usernames, sighting: sightings, error: errMessage});
   } catch (err) {
      console.error("Error loading admin dashboard:", err);
      res.render("admindashboard", {names: [], users: [], sighting: [], error: "Failed to load dashboard data."});
   }
});


//Start of user's information update for admindashboard
app.get("/admin/users", isAuthenticated, adminOnly, async (req, res) => {
   try {
      const userId = req.query.id;
      console.log("userid:", userId);

      // declare message variable up front
      let message = null;

      if (req.query.update === "true") {
         message = "Profile has been updated.";
      }
      console.log(message);

      const userSQL = `
      SELECT *
      FROM users
      WHERE userId = ?
      `;
      const [rows] = await conn.query(userSQL, [userId]);

      res.render("dashboardedit", {section: "users", profile: rows, message: message });
   } catch (err) {
      console.error("Error fetching user:", err);
      res.render("dashboardedit", {section: "users", profile: [], error: "Failed to load user data."});
   }
});

app.post("/admin/users/update", isAuthenticated, adminOnly, async (req, res) => {
   try {
      //form data from req.body
      const { username, password, email, role, first_name, last_name, bio, avatar_url, contact, userId} = req.body;

      let updateSQL =`UPDATE users 
                     SET username = ?, password = ?, email = ?, role = ?,
                     first_name = ?, last_name = ?, bio = ?, avatar_url = ?, contact = ?
                     WHERE userId = ?`;

      //manage the correct id to repopulate the user if its current
      if (parseInt(userId, 10) === req.session.user.id) {
         // Admin is editing their own profile
         req.session.user.avatar = avatar_url;
         req.session.user.role = role;
         req.session.user.user = username;
      }

      //update information in database
      let passwordHash = await bcrypt.hash(password, 10);
      await conn.query(updateSQL, [username, passwordHash, email, role, first_name, last_name, bio, avatar_url, contact, userId]);

      //rerun queries to get all information
      res.redirect(`/admin/users?id=${userId}&update=true`);
   } catch (err) {
      console.error(err);
      res.redirect(`admindashboard`);
   }
});

app.get("/admin/users/delete", isAuthenticated, adminOnly, async (req, res) => {
  try {
      const userId = req.query.id;

      let deleteSQL = `DELETE 
                     FROM users WHERE userId = ?`;
      await conn.query(deleteSQL , [userId]);

      res.redirect("/admindashboard?deleted=true&option=user");
  } catch (err) {
      console.error("Error deleting user:", err);
      res.redirect("/admindashboard?error=Delete+failed");
  }
});// continuation of update/delete for user's information via admin dashboard


//sightings admindashboard
app.get("/admin/sightings", isAuthenticated, adminOnly, async (req, res) => {

   try {
      const sightingId = req.query.sighting;
      console.log('sightingid:', sightingId);

      let message = null;

      if (req.query.update === "true") {
         message = "Sightings has been updated.";
      }
      console.log(message);

      //fill up dropdown with column names(users)
      const sightingSQL = `
               SELECT *
               FROM sightings
               WHERE sighting_id = ?;
               `;
      const [sightingrow] = await conn.query(sightingSQL,[sightingId]);

      //fill up dropdown with column names(users)
      const userSQL = `
                     SELECT userId, username
                     FROM users
                     ORDER by userId;
                     `;
      const [userrows] = await conn.query(userSQL);

      res.render('dashboardedit', {section: 'sightings', users: userrows, sighting: sightingrow, profile: [], message});
   } catch (err) {
      console.error("Error fetching user:", err);
      res.render("dashboardedit", {section: "users", profile: [], error: "Failed to load user data."});
   }

});

app.post("/admin/sightings/update", isAuthenticated, adminOnly, async (req, res) => {
   try {
      //form data from req.body
      const { userId, cryptid_id, sighting_date, description, image_url, danger_level, location_name, updated_at, sighting_id } = req.body;

      console.log(userId, cryptid_id, sighting_date, description, image_url, danger_level, location_name, updated_at, sighting_id);
      let updateSQL =`UPDATE sightings 
                     SET userId = ?, cryptid_id = ?, sighting_date = ?,
                     description = ?, image_url = ?, danger_level = ?, updated_at = ?,
                     location_name = ?
                     WHERE sighting_id = ?`;

      await conn.query(updateSQL, [userId, cryptid_id, sighting_date, description, image_url, danger_level, updated_at, location_name, sighting_id]);

      //rerun queries to get all information
      res.redirect(`/admin/sightings?sighting=${sighting_id}&update=true`);
   } catch (err) {
      console.error(err);
      res.redirect(`admindashboard`);
   }
});

app.get("/admin/sightings/delete", isAuthenticated, adminOnly, async (req, res) => {
  try {
      const sightingId = req.query.id;

      let deleteSQL = `DELETE 
                     FROM sightings WHERE sighting_id = ?`;
      await conn.query(deleteSQL , [sightingId]);

      res.redirect("/admindashboard?deleted=true&option=sighting");
  } catch (err) {
      console.error("Error deleting user:", err);
      res.redirect("/admindashboard?error=Delete+failed");
  }
});// continuation of update/delete for sightings information via admin dashboard

//cryptids admindashboard
app.get("/admin/cryptids", isAuthenticated, adminOnly, async (req, res) => {
   const cryptidId = req.query.cryptid;
   console.log('cryptidid:', cryptidId);

   res.render('dashboardedit', {section: 'cryptids'});
});

//
app.get("/admin/addcryptid", isAuthenticated, adminOnly, async (req, res) => {


   res.render('dashboardedit', {section: 'add_cryptid'});
});

/*****************************************/

/*******APIS CAN GO HERE*************/
app.get('/api/avatars', async (req, res) => {
   try {
      let avatars = `
      SELECT *
      FROM avatars
      `;
      const [rows] = await conn.query(avatars);
      res.send(rows);
   } catch (err) {
      console.error('Error fetching avatars:', err);
      res.status(500).json({ error: 'Failed to load avatars.' });
   }
});


app.get('/api/cryptids', async (req, res) => {
   try {
      const { danger_level, search } = req.query;

      let sql = `
         SELECT cryptid_id, name, description,
                original_region, known_regions,
                danger_level, image_url
         FROM cryptids
      `;

      let params = [];
      let where = [];

      if (danger_level) {
         where.push('danger_level = ?');
         params.push(danger_level);
      }

      if (search) {
         where.push('(name LIKE ? OR description LIKE ?)');
         params.push(`%${search}%`, `%${search}%`);
      }

      if (where.length) {
         sql += ' WHERE ' + where.join(' AND ');
      }

      sql += ' ORDER BY name';

      const [rows] = await conn.query(sql, params);
      res.json(rows);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch cryptids' });
   }
});

//individual cryptid api
app.get('/api/cryptids/:id', async (req, res) => {
   try {
      const id = req.params.id;

      const sql = `
         SELECT 
            c.cryptid_id,
            c.name,
            c.description,
            c.original_region,
            c.known_regions,
            c.danger_level,
            c.image_url,
            COALESCE(stats.sighting_count, 0) AS sighting_count,
            stats.avg_sighting_danger
         FROM cryptids c
         LEFT JOIN (
            SELECT 
               cryptid_id,
               COUNT(*) AS sighting_count,
               AVG(danger_level) AS avg_sighting_danger
            FROM sightings
            GROUP BY cryptid_id
         ) stats ON stats.cryptid_id = c.cryptid_id
         WHERE c.cryptid_id = ?
         LIMIT 1
      `;

      const [rows] = await conn.query(sql, [id]);

      if (!rows.length) {
         return res.status(404).json({ error: 'Cryptid not found' });
      }

      res.json(rows[0]);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch cryptid' });
   }
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
