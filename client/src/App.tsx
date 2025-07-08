import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import UserPage from './components/UserPage';
import SearchAlbum from './components/SearchAlbum';
import RegisterPage from './components/RegisterPage';
import LoginPage from './components/LoginPage';
import SearchUser from './components/SearchUser';
import Follows from './components/Follows';
import HomePage from './components/HomePage';
import { useEffect, useState } from 'react';
import axios from 'axios';
import {User} from './types/index';

function App() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    axios.get(`${apiUrl}/loginStatus`, { withCredentials: true })
      .then(res => {
        setLoggedIn(res.data.loggedIn);
        if (res.data.loggedIn) {
          setUser(res.data.user);
        }
      })
      .catch(err => {
        console.error(err);
        setLoggedIn(false);
      });
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage setLoggedIn={setLoggedIn} setUser={setUser} />} />
        <Route path="/login" element={<LoginPage setLoggedIn={setLoggedIn} setUser={setUser} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/home"
          element={
            loggedIn === null
              ? null
              : loggedIn
              ? <UserPage user={user} />
              : <Navigate to="/login" />
          }
        />
        <Route
          path="/searchAlbum"
          element={
            loggedIn === null
              ? null
              : loggedIn
              ? <SearchAlbum user={user} />
              : <Navigate to="/login" />
          }
        />
        <Route
          path="/searchUser"
          element={
            loggedIn === null
              ? null
              : loggedIn
              ? <SearchUser user={user} />
              : <Navigate to="/login" />
          } 
        />
        <Route
          path="/follows"
          element={
            loggedIn === null
              ? null
              : loggedIn
              ? <Follows user={user} />
              : <Navigate to="/login" />
          } 
        />
        <Route
          path="/feed"
          element={
            loggedIn === null
              ? null
              : loggedIn
              ? <HomePage user={user} />
              : <Navigate to="/login" />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;