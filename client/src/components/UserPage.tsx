import Headerbar from './Headerbar';
import UserInfo from './UserInfo';
import UserAlbums from './UserAlbums';
import bochi from '../assets/bochiPorter.webp';
import '../index.css';
import { useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { User, UserRating, FollowData, FollowState } from '../types'; 
import { SearchInfo, AlbumRating } from '../types/index';

interface UserPageProps {
  user: User | null;
}



export default function UserPage({ user }: UserPageProps) {
    const [userInformation, setUserInformation] = useState<SearchInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null)
    const location = useLocation();
    const username = user?.username;

    useEffect(() => {
        if (!username) return;
        const query = username;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        fetch(`${apiUrl}/searchUser`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ query })
        })
        .then((res) => {
           if (!res.ok) throw new Error(`http error, status: ${res.status}`); 
           return res.json();
        })
        .then((data: SearchInfo) => {
            console.log('User retrieved');
            setUserInformation(data);
        })
        .catch((err: Error) => {
            console.log('Error:', err);
            setError(err.message);
        })
        .finally(() => {
            setLoading(false);
        });
    }, [location.pathname, username]);

    return (
        <div className="min-h-screen bg-gray-900 px-8">
            <Headerbar />
            <UserInfo
                name={user?.username}
                albumsRated={userInformation?.ratings_count || 0}
                followers={userInformation?.followers?.length || 0} 
                following={userInformation?.following?.length || 0}
                pfp={bochi}
            />
            <UserAlbums username={user?.username} userRatings={userInformation?.albums || []} self={true}/>
        </div>
    );
}