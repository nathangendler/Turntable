import React, { useState, useEffect } from 'react';
import Headerbar from './Headerbar';
import UserInfo from './UserInfo';
import UserAlbums from './UserAlbums';
import { useLocation } from 'react-router-dom';
import '../index.css';
import { User, Album } from '../types';
import bochi from '../assets/bochiPorter.webp';
import { SearchInfo, AlbumRating } from '../types/index';
import { Button } from "@/components/ui/button";

interface SearchUserProps {
  user: User | null;
}

export default function SearchUser({ user }: SearchUserProps) {
    const { state } = useLocation() as { state: { query?: string } };
    const query = state?.query || '';
    const [searchInfo, setSearchInfo] = useState<SearchInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [buttonContent, setButtonContent] = useState('Follow');
    const [isFollowing, setIsFollowing] = useState<boolean>(false);

    useEffect(() => {
        if (!query) return;
        setLoading(true);
        setError(null);
        fetch('http://localhost:3001/api/searchUser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        })
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP error, status: ${res.status}`); 
            return res.json();
        })
        .then((data: SearchInfo) => {
            console.log('User retrieved');
            setSearchInfo(data);
            // Fix: Check if user exists and has an id before checking followers
            const alreadyFollowing = user?.id ? data.followers?.includes(user.id) : false;
            setIsFollowing(alreadyFollowing || false);
            setButtonContent(alreadyFollowing ? 'Unfollow' : 'Follow');
        })
        .catch((err: Error) => {
            console.log('Error:', err);
            setError(err.message);
        })
        .finally(() => {
            setLoading(false);
        });
    }, [query, user?.id]);

    const handleFollowToggle = async () => {
        if (!searchInfo || !user) return;

        try {
            const endpoint = isFollowing ? 'unfollowUser' : 'followUser';
            const response = await fetch(`http://localhost:3001/api/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: user.id, 
                    targetUserId: searchInfo.id 
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to ${isFollowing ? 'unfollow' : 'follow'} user`);
            }
            setIsFollowing(!isFollowing);
            setButtonContent(!isFollowing ? 'Unfollow' : 'Follow');
            setSearchInfo(prev => prev ? {
                ...prev,
                followers: !isFollowing 
                    ? [...(prev.followers || []), user.id]
                    : (prev.followers || []).filter(id => id !== user.id)
            } : null);

        } catch (err) {
            console.error('Error toggling follow status:', err);
            setError('Failed to update follow status');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 px-8">
                <Headerbar />
                <div className="flex justify-center items-center h-64">
                    <div className="text-white text-lg">Loading user...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 px-8">
                <Headerbar />
                <div className="flex justify-center items-center h-64">
                    <div className="text-red-500 text-lg">Error: {error}</div>
                </div>
            </div>
        );
    }

    if (!searchInfo) {
        return (
            <div className="min-h-screen bg-gray-900 px-8">
                <Headerbar />
                <div className="flex justify-center items-center h-64">
                    <div className="text-white text-lg">No user found</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 px-8">
            <Headerbar />
            <div className="mb-6 flex items-center justify-between">
                <UserInfo
                    name={searchInfo.username}
                    albumsRated={searchInfo.ratings_count || 0}
                    followers={searchInfo.followers?.length || 0} 
                    following={searchInfo.following?.length || 0}
                    pfp={bochi}
                />
                {user && searchInfo.id !== user.id && (
                    <div className="pt-24">
                        <Button 
                            onClick={handleFollowToggle}
                            {...(!isFollowing ? { variant: "secondary" } : {className: "border-gray-700 focus:outline-none bg-gray-500 hover:bg-gray-800 transition-colors"})}
                        >
                            {buttonContent}
                        </Button>
                    </div>
                )}
            </div>
            <UserAlbums 
                username={searchInfo.username} 
                userRatings={searchInfo.albums || []} 
                self={false}
            />
        </div>
    );
}