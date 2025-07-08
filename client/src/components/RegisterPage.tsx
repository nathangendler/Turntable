import React from 'react';
import {useNavigate} from 'react-router-dom';
import {useState} from 'react';

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const handleRegister = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Registration successful!');
        navigate('/login');
      } else {
        alert(`Registration failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Request failed:', err);
      alert('Error occurred while registering');
    }
  };

  const handleRoute = () => {
    navigate('/login');
  } 

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="flex flex-col space-y-4 bg-gray-800 p-8 rounded-lg shadow-lg">
        <h1 className="text-white text-2xl font-bold mb-2">TurnTable</h1>
        <h2 className="text-white text-lg">Username</h2>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="bg-transparent border border-white text-white px-4 py-2 rounded outline-none focus:ring-2 focus:ring-white"
          placeholder="Enter your username"
        />
        <h2 className="text-white text-lg">Password</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-transparent border border-white text-white px-4 py-2 rounded outline-none focus:ring-2 focus:ring-white"
          placeholder="Enter your password"
        />
        <button
          onClick={handleRegister}
          className="bg-white text-black px-4 py-2 rounded hover:bg-gray-200 transition"
        >
          Sign up
        </button>
        <button
          className="bg-white text-black px-4 py-2 rounded hover:bg-gray-200 transition"
          onClick={handleRoute}
        >
          Already have an account? Login
        </button>
      </div>
    </div>
  );
}