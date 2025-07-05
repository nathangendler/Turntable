const fs = require('fs');
const mysql = require('mysql2');

// Connect to MySQL *without* specifying database yet
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Harvestmoon19$' // replace with your actual password
});

const schema = fs.readFileSync('./schema.sql', 'utf8');

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL');
  
  connection.query(schema, (err, results) => {
    if (err) throw err;
    console.log('✅ Schema executed successfully');
    connection.end();
  });
});
