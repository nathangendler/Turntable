import express, { Request, Response } from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import mysql, { Connection, RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = parseInt(process.env.PORT || '3001');

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      password: string;
    };
  }
}

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

interface FeedPost extends RowDataPacket {
  id: number;
  user_id: number;
  username: string;
  album_id: number;
  album_name: string;
  artist_name: string;
  release_year: number;
  record_type: string;
  record_image: string;
  rating: number;
  created_at: Date;
  is_following: boolean;
}

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ["http://localhost:5173"],
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    name: "userID",
    secret: process.env.SESSION_SECRET || "development-only-change",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

app.use(express.json());

const db: Connection = mysql.createConnection({
  user: process.env.DB_USER || "root",
  host: process.env.DB_HOST || "localhost",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "turntable"
});

app.post('/api/register', (req, res): void => {
  const { username, password }: { username: string; password: string } = req.body;

  bcrypt.hash(password, saltRounds, (err: Error | undefined, hash: string) => {
    if (err) {
      res.status(500).json({ error: 'Password hashing failed' });
      return;
    }

    const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
    db.query<User[]>(checkUserQuery, [username], (err, results) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (results.length > 0) {
        res.status(400).json({ error: 'Username already taken' });
        return;
      }

      const insertQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
      db.query<ResultSetHeader>(insertQuery, [username, hash], (insertErr) => {
        if (insertErr) {
          res.status(500).json({ error: 'Failed to create user' });
          return;
        }
        res.status(200).json({ message: 'Registration successful' });
      });
    });
  });
});

app.post('/api/login', (req, res): void => {
  const { username, password }: { username: string; password: string } = req.body;
  const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
  
  db.query<User[]>(checkUserQuery, [username], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    if (results.length > 0) {
      bcrypt.compare(password, results[0].password, (error: Error | undefined, response: boolean) => {
        if (response) {
          req.session.user = results[0];
          res.status(200).json({
            message: 'Login successful',
            user: req.session.user 
          });
        } else {
          res.status(400).json({ message: 'username/password combination not found' });
        }
      });
    } else {
      res.status(400).json({ message: 'username/password combination not found' });
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
    return;
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
    if (err) {
      res.status(500).json({ error: 'Database error (album select)' });
      return;
    }

    const insertAlbumIfNeeded = (callback: (albumId: number) => void): void => {
      if (albumResults.length > 0) {
        callback(albumResults[0].id);
      } else {
        const insertAlbumQuery = `INSERT INTO albums 
          (album_name, artist_name, release_year, record_type, record_image) 
          VALUES (?, ?, ?, ?, ?)`;
        db.query<ResultSetHeader>(insertAlbumQuery, albumFill, (insertErr, insertRes) => {
          if (insertErr) {
            res.status(500).json({ error: 'Failed to insert album' });
            return;
          }
          callback(insertRes.insertId);
        });
      }
    };

    insertAlbumIfNeeded((albumId: number) => {
      db.query<User[]>('SELECT id FROM users WHERE username = ?', [username], (userErr, userResults) => {
        if (userErr) {
          res.status(500).json({ error: 'Database error (user select)' });
          return;
        }
        if (userResults.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResults[0].id;

        const insertRatingQuery = `INSERT INTO ratings (user_id, album_id, rating) VALUES (?, ?, ?) 
          ON DUPLICATE KEY UPDATE rating = VALUES(rating)`;

        db.query<ResultSetHeader>(insertRatingQuery, [userId, albumId, rating], (rateErr) => {
          if (rateErr) {
            res.status(500).json({ error: 'Failed to insert rating' });
            return;
          }

          res.status(200).json({ message: 'Rating logged successfully' });
        });
      });
    });
  });
});

app.post('/api/userRatings', (req, res): void => {
  const { username }: { username: string } = req.body;

  const userQuery = 'SELECT id FROM users WHERE username = ?';
  db.query<User[]>(userQuery, [username], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

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
      if (error) {
        res.status(500).json({ error: 'Failed to fetch joined data' });
        return;
      }
      res.status(200).json(joinedResults);
    });
  });
});

app.post('/api/followCount', (req, res): void => {
  const { username }: { username: string } = req.body;
  const userIdQuery = 'SELECT id FROM users WHERE username = ?';
  
  db.query<User[]>(userIdQuery, [username], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
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
      if (followErr) {
        res.status(500).json({ error: 'Failed to fetch follow data' });
        return;
      }
      res.status(200).json(followResults);
    });
  });
});

app.post('/api/searchAlbum', (req: Request, res: Response): void => {
  const searchTerm: string = req.body.query;

  if (!searchTerm) {
    res.status(400).json({ error: 'Missing search term' });
    return;
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
      res.status(500).json({ error: 'Python script failed', details: errorOutput });
      return;
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
        res.json(parsed);
      } else {
        throw new Error('No JSON found in Python output');
      }
    } catch (err) {
      res.status(500).json({ error: 'Invalid JSON returned from Python' });
    }
  });
});

app.post('/api/searchUser', (req, res): void => {
  const { query }: { query: string } = req.body;
  const userQuery = 'SELECT id, username FROM users WHERE username = ?';
  db.query<User[]>(userQuery, [query], (userError, userResults) => {
    if (userError) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    if (userResults.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
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
      if (ratingsError) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      db.query<RowDataPacket[]>(followersQuery, [userId], (followersError, followersResults) => {
        if (followersError) {
          res.status(500).json({ error: 'Database error' });
          return;
        }

        db.query<RowDataPacket[]>(followingQuery, [userId], (followingError, followingResults) => {
          if (followingError) {
            res.status(500).json({ error: 'Database error' });
            return;
          }

          const followers = followersResults.map(row => row.id);
          const following = followingResults.map(row => row.id);

          const userData = {
            id: userId,
            username: username,
            followers: followers,
            following: following,
            ratings_count: ratingsResults.length,
            albums: ratingsResults
          };

          res.status(200).json(userData);
        });
      });
    });
  });
});

app.post('/api/followUser', (req, res): void => {
  const { userId, targetUserId }: { userId: number; targetUserId: number } = req.body;
  
  if (!userId || !targetUserId) {
    res.status(400).json({ error: 'Missing userId or targetUserId' });
    return;
  }
  
  if (userId === targetUserId) {
    res.status(400).json({ error: 'Cannot follow yourself' });
    return;
  }
  
  const checkFollowQuery = 'SELECT * FROM follows WHERE follower_id = ? AND followee_id = ?';
  db.query<RowDataPacket[]>(checkFollowQuery, [userId, targetUserId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    if (results.length > 0) {
      res.status(400).json({ error: 'Already following this user' });
      return;
    }
    
    const insertFollowQuery = 'INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)';
    db.query<ResultSetHeader>(insertFollowQuery, [userId, targetUserId], (insertErr) => {
      if (insertErr) {
        res.status(500).json({ error: 'Failed to follow user' });
        return;
      }
      res.status(200).json({ message: 'Successfully followed user' });
    });
  });
});

app.post('/api/unfollowUser', (req, res): void => {
  const { userId, targetUserId }: { userId: number; targetUserId: number } = req.body;
  
  if (!userId || !targetUserId) {
    res.status(400).json({ error: 'Missing userId or targetUserId' });
    return;
  }
  
  const deleteFollowQuery = 'DELETE FROM follows WHERE follower_id = ? AND followee_id = ?';
  db.query<ResultSetHeader>(deleteFollowQuery, [userId, targetUserId], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    if (result.affectedRows === 0) {
      res.status(400).json({ error: 'Not following this user' });
      return;
    }
    
    res.status(200).json({ message: 'Successfully unfollowed user' });
  });
});

app.post('/api/getFollowProfiles', (req, res): void => {
  const { username, type }: { username: string; type: 'followers' | 'following' } = req.body;
  
  if (!username || !type) {
    res.status(400).json({ error: 'Username and type are required' });
    return;
  }

  if (type !== 'followers' && type !== 'following') {
    res.status(400).json({ error: 'Type must be either "followers" or "following"' });
    return;
  }

  const getUserIdQuery = 'SELECT id FROM users WHERE username = ?';
  
  db.query<User[]>(getUserIdQuery, [username], (userErr, userResults) => {
    if (userErr) {
      res.status(500).json({ error: 'Database error while finding user' });
      return;
    }
    
    if (userResults.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userId = userResults[0].id;

    let query: string;
    if (type === 'followers') {
      query = `
        SELECT 
          u.id,
          u.username,
          COUNT(r.id) as ratings_count,
          (SELECT COUNT(*) FROM follows WHERE followee_id = u.id) as followers,
          (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following
        FROM follows f
        JOIN users u ON f.follower_id = u.id
        LEFT JOIN ratings r ON u.id = r.user_id
        WHERE f.followee_id = ?
        GROUP BY u.id, u.username
        ORDER BY u.username
      `;
    } else {
      query = `
        SELECT 
          u.id,
          u.username,
          COUNT(r.id) as ratings_count,
          (SELECT COUNT(*) FROM follows WHERE followee_id = u.id) as followers,
          (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following
        FROM follows f
        JOIN users u ON f.followee_id = u.id
        LEFT JOIN ratings r ON u.id = r.user_id
        WHERE f.follower_id = ?
        GROUP BY u.id, u.username
        ORDER BY u.username
      `;
    }

    db.query(query, [userId], (err, results) => {
      if (err) {
        res.status(500).json({ error: 'Database error', details: err.message });
        return;
      }
      
      res.status(200).json(results);
    });
  });
});

app.post('/api/getFeed', (req, res): void => {
  const { userId, page = 0, limit = 10 }: { 
    userId: number; 
    page?: number; 
    limit?: number;
  } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  const offset = page * limit;

  const feedQuery = `
    (
      SELECT 
        r.id,
        r.user_id,
        u.username,
        r.album_id,
        a.album_name,
        a.artist_name,
        a.release_year,
        a.record_type,
        a.record_image,
        r.rating,
        CURRENT_TIMESTAMP as created_at,
        1 as is_following,
        1 as sort_priority
      FROM ratings r
      JOIN users u ON r.user_id = u.id
      JOIN albums a ON r.album_id = a.id
      JOIN follows f ON f.followee_id = r.user_id AND f.follower_id = ?
      WHERE r.user_id != ?
      ORDER BY r.id DESC
    )
    UNION ALL
    (
      SELECT 
        r.id,
        r.user_id,
        u.username,
        r.album_id,
        a.album_name,
        a.artist_name,
        a.release_year,
        a.record_type,
        a.record_image,
        r.rating,
        CURRENT_TIMESTAMP as created_at,
        0 as is_following,
        2 as sort_priority
      FROM ratings r
      JOIN users u ON r.user_id = u.id
      JOIN albums a ON r.album_id = a.id
      WHERE r.user_id != ?
      AND r.user_id NOT IN (
        SELECT followee_id FROM follows WHERE follower_id = ?
      )
      ORDER BY RAND()
    )
    ORDER BY sort_priority ASC, id DESC
    LIMIT ? OFFSET ?
  `;

  db.query<FeedPost[]>(feedQuery, [userId, userId, userId, userId, limit, offset], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Database error', details: err.message });
      return;
    }

    const countQuery = `
      SELECT COUNT(*) as total FROM (
        (
          SELECT r.id
          FROM ratings r
          JOIN follows f ON f.followee_id = r.user_id AND f.follower_id = ?
          WHERE r.user_id != ?
        )
        UNION ALL
        (
          SELECT r.id
          FROM ratings r
          WHERE r.user_id != ?
          AND r.user_id NOT IN (
            SELECT followee_id FROM follows WHERE follower_id = ?
          )
        )
      ) as combined_feed
    `;

    db.query(countQuery, [userId, userId, userId, userId], (countErr, countResults: any) => {
      if (countErr) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      const totalPosts = countResults[0].total;
      const hasMore = offset + limit < totalPosts;

      res.status(200).json({
        posts: results,
        hasMore: hasMore,
        page: page,
        totalPosts: totalPosts
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});