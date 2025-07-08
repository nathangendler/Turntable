import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';


interface LoginPageProps {
  setLoggedIn: (loggedIn: boolean) => void;
  setUser: (user: User | null) => void;
}

export default function LoginPage({ setLoggedIn, setUser }: LoginPageProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>(''); 
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleLogin = async (): Promise<void> => {
    if (!username || !password) {
      alert('Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        setLoggedIn(true);
        setUser(data.user);
        alert('Login successful!');
        navigate('/home');
      } else {
        alert(`Login failed: ${data.message}`);
      }
    } catch (err) {
      console.error('Request failed:', err);
      alert('Error occurred while logging in');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const handleRegisterRoute = (): void => {
    navigate('/register');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="flex flex-col space-y-4 bg-gray-800 p-8 rounded-lg shadow-lg">
        <h1 className="text-white text-2xl font-bold mb-2">TurnTable</h1>
        <h2 className="text-white text-lg">Username</h2>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={handleKeyPress}
          className="bg-transparent border border-white text-white px-4 py-2 rounded outline-none focus:ring-2 focus:ring-white"
          placeholder="Enter your username"
        />
        <h2 className="text-white text-lg">Password</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          className="bg-transparent border border-white text-white px-4 py-2 rounded outline-none focus:ring-2 focus:ring-white"
          placeholder="Enter your password"
        />
        <button
          onClick={handleLogin}
          disabled={loading || !username || !password}
          className={`px-4 py-2 rounded transition ${
            loading || !username || !password
              ? 'bg-gray-500 cursor-not-allowed text-gray-300' 
              : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <button
          onClick={handleRegisterRoute}
          className="bg-white text-black px-4 py-2 rounded hover:bg-gray-200 transition"
        >
          Don't have an account? Register
        </button>
      </div>
    </div>
  );
}