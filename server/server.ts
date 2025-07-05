import express, { Request, Response } from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import mysql, { Connection, RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';

const app = express();
const PORT = 3001;
const saltRounds = 10;

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      password: string;
    };
  }
}

// Type definitions
interface User extends RowDataPacket {
  id: number;
  username: string;
  password: string;
}

interface Album extends RowDataPacket {
  id: number;
  album_name: string;
  artist_name: string;
  release_year: string;
  record_type: string;
  record_image: string;
}

interface Rating extends RowDataPacket {
  id: number;
  user_id: number;
  album_id: number;
  rating: number;
}

interface UserRating extends RowDataPacket {
  id: number;
  album_name: string;
  artist_name: string;
  release_year: string;
  record_type: string;
  record_image: string;
  user_rating: number;
}

interface FollowData extends RowDataPacket {
  username: string;
  relationship_type: 'following' | 'follower';
}

interface SelectedAlbum {
  album_name: string;
  artist_name: string;
  release_date: string;
  record_type: string;
  image_url: string;
}

// Middleware setup
app.use(cors({
  origin: ["http://localhost:5173"],
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    name: "userID", // Changed from 'key' to 'name'
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

app.use(express.json());

// Database connection
const db: Connection = mysql.createConnection({
  user: "root",
  host: "localhost",
  password: "Harvestmoon19$",
  database: "turntable"
});

// Routes
app.post('/api/register', (req, res) => {
  const { username, password }: { username: string; password: string } = req.body;

  bcrypt.hash(password, saltRounds, (err: Error | undefined, hash: string) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: 'Password hashing failed' });
    }

    const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
    db.query<User[]>(checkUserQuery, [username], (err, results) => {
      if (err) {
        console.error('db error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      const insertQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
      db.query<ResultSetHeader>(insertQuery, [username, hash], (insertErr) => {
        if (insertErr) {
          console.error('Insert error:', insertErr);
          return res.status(500).json({ error: 'Failed to create user' });
        }
        return res.status(200).json({ message: 'Registration successful' });
      });
    });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password }: { username: string; password: string } = req.body;
  const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
  
  db.query<User[]>(checkUserQuery, [username], (err, results) => {
    if (err) {
      console.error('db error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length > 0) {
      bcrypt.compare(password, results[0].password, (error: Error | undefined, response: boolean) => {
        if (response) {
          req.session.user = results[0];
          return res.status(200).json({
            message: 'Login successful',
            user: req.session.user 
          });
        } else {
          return res.status(400).json({ message: 'username/password combination not found' });
        }
      });
    } else {
      return res.status(400).json({ message: 'username/password combination not found' });
    }
  });
});

app.get('/api/loginStatus', (req: Request, res: Response): void => {
  if (req.session.user) {
    res.status(200).json({ loggedIn: true, user: req.session.user });
  } else {
    res.status(200).json({ loggedIn: false });
  }
});

app.post('/api/log', (req, res): void => {
  const { username, selectedAlbum, rating }: { 
    username: string; 
    selectedAlbum: SelectedAlbum; 
    rating: number 
  } = req.body;

  if (!username || !selectedAlbum || rating == null) {
    res.status(400).json({ error: 'Missing required data' });
  }

  const albumFill: (string | null)[] = [
    selectedAlbum.album_name,
    selectedAlbum.artist_name,
    selectedAlbum.release_date,
    selectedAlbum.record_type,
    selectedAlbum.image_url
  ];

  const albumQuery = `SELECT id FROM albums 
    WHERE album_name = ? AND artist_name = ? AND release_year = ? AND record_type = ? AND record_image = ?`;

  db.query<Album[]>(albumQuery, albumFill, (err, albumResults) => {
    if (err) return res.status(500).json({ error: 'Database error (album select)' });

    const insertAlbumIfNeeded = (callback: (albumId: number) => void): void => {
      if (albumResults.length > 0) {
        callback(albumResults[0].id);
      } else {
        const insertAlbumQuery = `INSERT INTO albums 
          (album_name, artist_name, release_year, record_type, record_image) 
          VALUES (?, ?, ?, ?, ?)`;
        db.query<ResultSetHeader>(insertAlbumQuery, albumFill, (insertErr, insertRes) => {
          if (insertErr) return res.status(500).json({ error: 'Failed to insert album' });
          callback(insertRes.insertId);
        });
      }
    };

    insertAlbumIfNeeded((albumId: number) => {
      db.query<User[]>('SELECT id FROM users WHERE username = ?', [username], (userErr, userResults) => {
        if (userErr) return res.status(500).json({ error: 'Database error (user select)' });
        if (userResults.length === 0) return res.status(404).json({ error: 'User not found' });

        const userId = userResults[0].id;

        const insertRatingQuery = `INSERT INTO ratings (user_id, album_id, rating) VALUES (?, ?, ?) 
          ON DUPLICATE KEY UPDATE rating = VALUES(rating)`;

        db.query<ResultSetHeader>(insertRatingQuery, [userId, albumId, rating], (rateErr) => {
          if (rateErr) return res.status(500).json({ error: 'Failed to insert rating' });

          return res.status(200).json({ message: 'Rating logged successfully' });
        });
      });
    });
  });
});

app.post('/api/userRatings', (req, res) => {
  const { username }: { username: string } = req.body;

  const userQuery = 'SELECT id FROM users WHERE username = ?';
  db.query<User[]>(userQuery, [username], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });

    const userId = results[0].id;

    const fullRatingsQuery = `
      SELECT 
        albums.*, 
        ratings.rating AS user_rating 
      FROM ratings
      JOIN albums ON ratings.album_id = albums.id
      WHERE ratings.user_id = ?
    `;

    db.query<UserRating[]>(fullRatingsQuery, [userId], (error, joinedResults) => {
      if (error) return res.status(500).json({ error: 'Failed to fetch joined data' });
      return res.status(200).json(joinedResults);
    });
  });
});

app.post('/api/followCount', (req, res) => {
  const { username }: { username: string } = req.body;
  const userIdQuery = 'SELECT id FROM users WHERE username = ?';
  
  db.query<User[]>(userIdQuery, [username], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const userId = results[0].id;

    const followQuery = `
      (
        SELECT u.username, 'following' AS relationship_type
        FROM follows f
        JOIN users u ON f.followee_id = u.id
        WHERE f.follower_id = ?
      )
      UNION
      (
        SELECT u.username, 'follower' AS relationship_type
        FROM follows f
        JOIN users u ON f.follower_id = u.id
        WHERE f.followee_id = ?
      )
    `;
    
    db.query<FollowData[]>(followQuery, [userId, userId], (followErr, followResults) => {
      if (followErr) return res.status(500).json({ error: 'Failed to fetch follow data' });
      return res.status(200).json(followResults);
    });
  });
});

app.post('/api/searchAlbum', (req: Request, res: Response): void => {
  const searchTerm: string = req.body.query;

  if (!searchTerm) {
    res.status(400).json({ error: 'Missing search term' });
  }

  const searchURL = `https://www.albumoftheyear.org/search/?q=${encodeURIComponent(searchTerm)}`;

  const python = spawn('python', [path.join(__dirname, 'scrape.py'), searchURL]);

  let output = '';
  let errorOutput = '';

  python.stdout.on('data', (data: Buffer) => {
    output += data.toString();
  });

  python.stderr.on('data', (data: Buffer) => {
    errorOutput += data.toString();
  });

  python.on('close', (code: number | null) => {
    if (code !== 0) {
      return res.status(500).json({ error: 'Python script failed', details: errorOutput });
    }

    try {
      const lines = output.trim().split('\n');
      let jsonLine = '';

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.startsWith('[') || line.startsWith('{')) {
          jsonLine = line;
          break;
        }
      }

      if (jsonLine) {
        const parsed = JSON.parse(jsonLine);
        console.log(`Successfully parsed ${parsed.length} albums`);
        return res.json(parsed);
      } else {
        throw new Error('No JSON found in Python output');
      }
    } catch (err) {
      return res.status(500).json({ error: 'Invalid JSON returned from Python' });
    }
  });
});

app.post('/api/searchUser', (req, res) => {
  const { query } = req.body;
  const userQuery = 'SELECT id, username FROM users WHERE username = ?';
  db.query<User[]>(userQuery, [query], (userError, userResults) => {
    if (userError) return res.status(500).json({ error: 'Database error' });
    if (userResults.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResults[0].id;
    const username = userResults[0].username;

     const ratingsQuery = `
      SELECT 
        albums.id as album_id,
        albums.artist_name,
        albums.album_name,
        albums.release_year,
        albums.record_type,
        albums.record_image,
        ratings.rating
      FROM ratings
      JOIN albums ON ratings.album_id = albums.id
      WHERE ratings.user_id = ?
      ORDER BY ratings.rating DESC
    `;

     const followersQuery = `
      SELECT u.id
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.followee_id = ?
    `;

    const followingQuery = `
      SELECT u.id
      FROM follows f
      JOIN users u ON f.followee_id = u.id
      WHERE f.follower_id = ?
    `;

    db.query<UserRating[]>(ratingsQuery, [userId], (ratingsError, ratingsResults) => {
      if (ratingsError) return res.status(500).json({ error: 'Database error' });

      db.query<RowDataPacket[]>(followersQuery, [userId], (followersError, followersResults) => {
        if (followersError) return res.status(500).json({ error: 'Database error' });

        db.query<RowDataPacket[]>(followingQuery, [userId], (followingError, followingResults) => {
          if (followingError) return res.status(500).json({ error: 'Database error' });

          const followers = followersResults.map(row => row.id);
          const following = followingResults.map(row => row.id);

           const userData = {
            username: username,
            followers: followers,
            following: following,
            ratings_count: ratingsResults.length,
            albums: ratingsResults
          };

          return res.status(200).json(userData);
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});