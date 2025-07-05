import React, { useState, useEffect } from 'react';
import Headerbar from './Headerbar';
import UserInfo from './UserInfo';
import UserAlbums from './UserAlbums';
import { useLocation } from 'react-router-dom';
import '../index.css';
import { User, Album } from '../types';
import bochi from '../assets/bochiPorter.webp';
import { SearchInfo, AlbumRating } from '../types/index';

interface SearchUserProps {
  user: User | null;
}



export default function SearchUser({ user }: SearchUserProps){
    const { state } = useLocation() as { state: { query?: string } };
    const query = state?.query || '';
    const [searchInfo, setSearchInfo] = useState<SearchInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null)
    useEffect(() => {
        if (!query) return;
        setLoading(true);
        setError(null);
        fetch('http://localhost:3001/api/searchUser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({ query }),
        })
        .then((res) => {
           if (!res.ok) throw new Error(`http error, status: ${res.status}`); 
           return res.json();
        })
        .then((data: SearchInfo) => {
            console.log('User retrieved');
            setSearchInfo(data);
        })
        .catch((err: Error) => {
            console.log('Error:', err);
            setError(err.message);
        })
        .finally(() => {
            setLoading(false);
        });
    }, [query]);

    return(
        <div className="min-h-screen bg-gray-900 px-8">
            <Headerbar />
            <div>
                <UserInfo
                    name={searchInfo?.username}
                    albumsRated={searchInfo?.ratings_count || 0}
                    followers={searchInfo?.followers?.length || 0} 
                    following={searchInfo?.following?.length || 0}
                    pfp={bochi}
                />
            </div>
            <UserAlbums username={searchInfo?.username} userRatings={searchInfo?.albums || []} self={false}/>
        </div>

    )

}
