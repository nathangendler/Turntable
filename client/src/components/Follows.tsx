const processImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return '/default-profile-pic.jpg';
    return `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=800&h=800`;
  };import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { User } from '../types';
import { useNavigate } from 'react-router-dom';
import Headerbar from './Headerbar';

interface UserProfile {
  id: number;
  username: string;
  ratings_count: number;
  followers: number;
  following: number;
}

interface FollowsProps {
  user: User | null;
}

export default function Follows({ user }: FollowsProps) {
  const navigate = useNavigate();
  const { state } = useLocation() as { 
    state: { 
      listType: 'followers' | 'following';
      username: string;
    } 
  };

  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { listType, username } = state;

  useEffect(() => {
    if (!username || !listType) return;

    setLoading(true);
    setError(null);

    const fetchUserProfiles = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/getFollowProfiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: username,
            type: listType 
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error, status: ${response.status}`);
        }

        const data: UserProfile[] = await response.json();
        setUserProfiles(data);
      } catch (err) {
        console.error('Error fetching user profiles:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user profiles');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfiles();
  }, [username, listType]);

  const processImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return '/default-profile-pic.jpg'; // fallback image
    return `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=800&h=800`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 px-8">
        <Headerbar />
        <div className="pt-24 flex justify-center items-center h-64">
          <div className="text-white text-lg">Loading {listType}...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 px-8">
        <Headerbar />
        <div className="pt-24 flex justify-center items-center h-64">
          <div className="text-red-500 text-lg">Error: {error}</div>
        </div>
      </div>
    );
  }

  const handleClick = (profile: UserProfile) => {
    navigate('/searchUser', { state: { query: profile.username } });
  };

  return (
    <div className="min-h-screen bg-gray-900 px-8">
      <Headerbar />
      <div className="pt-24">
        <h1 className="text-white text-2xl font-bold mb-6">
          {listType === 'followers' ? 'Followers' : 'Following'} for {username} ({userProfiles.length})
        </h1>
        <div className="space-y-4">
          {userProfiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => handleClick(profile)}
              className="w-full bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="text-white font-semibold">{profile.username}</h3>
              <div className="text-gray-300 text-sm">
                <span>Ratings: {profile.ratings_count}</span>
                <span className="mx-4">Followers: {profile.followers}</span>
                <span>Following: {profile.following}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}