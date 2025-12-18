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

// cryptids page
app.get('/cryptids', (req, res) => {
   res.render('cryptids');
});

// sightings page
app.get('/sightings', async (req, res) => {
   try {
      //search options
      const mode = req.query.mode || 'cryptid';
      const order = req.query.order === 'oldest' ? 'oldest' : 'newest';

      const selectedLocationId = req.query.location_id || '';
      const selectedCryptidId = req.query.cryptid_id || '';
      const yearFrom = req.query.year_from || '';
      const yearTo = req.query.year_to || '';

      //dropdown data
      const [cryptids] = await conn.query(
         'select cryptid_id, name from cryptids order by name'
      );
      const [locations] = await conn.query(
         'select location_id, name from locations order by name'
      );
      const [yearRows] = await conn.query(
         'select distinct year(s.sighting_date) as year from sightings s order by year desc'
      );
      const years = yearRows.map(r => r.year);

      const baseSelect = `
         select s.sighting_id,
                s.sighting_date,
                s.description,
                c.name as cryptid_name,
                l.name as location_name,
                u.username as reported_by
         from sightings s
         join cryptids c on s.cryptid_id = c.cryptid_id
         join locations l on s.location_id = l.location_id
         left join users u on s.userId = u.userId
      `;

      let whereClauses = [];
      let params = [];

      //search specific filters
      if (mode === 'location' && selectedLocationId) {
         whereClauses.push('s.location_id = ?');
         params.push(selectedLocationId);
      } else if (mode === 'cryptid' && selectedCryptidId) {
         whereClauses.push('s.cryptid_id = ?');
         params.push(selectedCryptidId);
      } else if (mode === 'mine') {
         if (!req.session.authenticated || !req.session.user) {
            req.session.loginMessage = "Please sign in to view your sightings.";
            req.session.returnTo = req.originalUrl;
            return res.redirect('/login');
         }
         whereClauses.push('s.userId = ?');
         params.push(req.session.user.id);
      }

      //time range filter
      if (yearFrom && yearTo) {
         whereClauses.push('year(s.sighting_date) between ? and ?');
         params.push(yearFrom, yearTo);
      } else if (yearFrom) {
         whereClauses.push('year(s.sighting_date) >= ?');
         params.push(yearFrom);
      } else if (yearTo) {
         whereClauses.push('year(s.sighting_date) <= ?');
         params.push(yearTo);
      }

      const whereClause = whereClauses.length
         ? ' where ' + whereClauses.join(' and ')
         : '';

      const orderClause =
         order === 'oldest'
            ? ' order by s.sighting_date asc, s.created_at asc'
            : ' order by s.sighting_date desc, s.created_at desc';

      //sql query
      const sql = baseSelect + whereClause + orderClause + ' limit 100';

      const [sightings] = await conn.query(sql, params);

      //load
      res.render('sightings', {
         sightings,
         mode,
         order,
         cryptids,
         locations,
         years,
         selectedLocationId,
         selectedCryptidId,
         yearFrom,
         yearTo,
         error: null
      });
   } catch (err) {
      console.error(err);
      res.render('sightings', {
         sightings: [],
         mode: req.query.mode || 'cryptid',
         order: req.query.order || 'newest',
         cryptids: [],
         locations: [],
         years: [],
         selectedLocationId: req.query.location_id || '',
         selectedCryptidId: req.query.cryptid_id || '',
         yearFrom: req.query.year_from || '',
         yearTo: req.query.year_to || '',
         error: 'Could not load sightings.'
      });
   }
});

//new sighting page
app.get('/sightings/new', isAuthenticated, async (req, res) => {
   try {
      const [cryptids] = await conn.query(
         'select cryptid_id, name from cryptids order by name'
      );

      const message = req.session.message || null;
      const error = req.session.error || null;
      req.session.message = null;
      req.session.error = null;

      res.render('sightings-new', { cryptids, message, error });
   } catch (err) {
      console.error(err);
      res.status(500).send('Error loading new sighting form.');
   }
});

//submitting new sighting
app.post('/sightings/new', isAuthenticated, async (req, res) => {
   try {
      const userId = req.session.user.id;
      const {
         cryptid_id,
         location_name,
         date,
         time,
         details,
         mood //threat option
      } = req.body;

      if (!cryptid_id || !location_name || !date) {
         req.session.error = 'Cryptid, location, and date are required.';
         return res.redirect('/sightings/new');
      }

      const sightingTime = time && time.trim() !== '' ? time : '00:00';
      const sightingDateTime = `${date} ${sightingTime}:00`;

      //find or create location
      let [locRows] = await conn.query(
         'select location_id from locations where name = ?',
         [location_name]
      );

      let locationId;
      if (locRows.length > 0) {
         locationId = locRows[0].location_id;
      } else {
         const [locInsert] = await conn.query(
            'insert into locations (name) values (?)',
            [location_name]
         );
         locationId = locInsert.insertId;
      }

      //insert the sighting
      await conn.query(
         `insert into sightings (userId, cryptid_id, location_id, sighting_date, description)
          values (?, ?, ?, ?, ?)`,
         [userId, cryptid_id, locationId, sightingDateTime, details || null]
      );

      req.session.message = 'Sighting saved successfully.';
      res.redirect('/sightings?filter=mine');
   } catch (err) {
      console.error(err);
      req.session.error = 'There was a problem saving your sighting.';
      res.redirect('/sightings/new');
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
      req.session.message = "Profile has been updated.";

      // Redirect back to profile route
      res.redirect('/profile');
   } catch (err) {
      console.error(err);
      req.session.error = "Something went wrong updating your profile.";
      res.redirect('/profile/edit');
   }
});


app.get("/admindashboard", isAuthenticated, adminOnly, (req, res) => {
   res.render('admindashboard');
});

/*****************************************/

/*******APIS CAN GO HERE*************/
app.get('/api/avatars', async (req, res) => {
   let avatars = `SELECT *
                  FROM avatars`;
   const [rows] = await conn.query(avatars)
   res.send(rows);
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
