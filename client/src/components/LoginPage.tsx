import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from 'lucide-react';

interface LoginPageProps {
  setLoggedIn: (loggedIn: boolean) => void;
  setUser: (user: User | null) => void;
}

export default function LoginPage({ setLoggedIn, setUser }: LoginPageProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>(''); 
  const [loading, setLoading] = useState<boolean>(false);
  const [alertState, setAlertState] = useState<{
    show: boolean;
    type: 'error' | 'success';
    title: string;
    message: string;
  }>({
    show: false,
    type: 'error',
    title: '',
    message: ''
  });
  
  const navigate = useNavigate();

  const showAlert = (type: 'error' | 'success', title: string, message: string) => {
    setAlertState({
      show: true,
      type,
      title,
      message
    });
    
    
    setTimeout(() => {
      setAlertState(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const handleLogin = async (): Promise<void> => {
    if (!username || !password) {
      showAlert('error', 'Missing Information', 'Please enter both username and password');
      return;
    }

    setLoading(true);
    // Hide any existing alerts
    setAlertState(prev => ({ ...prev, show: false }));
    
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
        showAlert('success', 'Login Successful', 'Welcome back! Redirecting to home...');
        setLoggedIn(true);
        setUser(data.user);
        
        // Delay navigation slightly to show success message
        setTimeout(() => {
          navigate('/home');
        }, 1500);
      } else {
        showAlert('error', 'Login Failed', data.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Request failed:', err);
      showAlert('error', 'Connection Error', 'Unable to connect to server. Please try again.');
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
      <div className="flex flex-col space-y-4 bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-white text-2xl font-bold mb-2">TurnTable</h1>
        
        {/* Alert Component */}
        {alertState.show && (
          <Alert variant={alertState.type === 'error' ? 'destructive' : 'default'} className="mb-4">
            {alertState.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertTitle>{alertState.title}</AlertTitle>
            <AlertDescription>{alertState.message}</AlertDescription>
          </Alert>
        )}
        
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