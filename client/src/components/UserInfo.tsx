import React from 'react';
import bochi from '../assets/bochiPorter.webp';
import '../index.css';
import { Button } from "@/components/ui/button"
import { AlbumRating } from '../types/index';
import { useNavigate } from 'react-router-dom';
import {useState} from 'react';

interface UserInfoProps {
  name?: string;
  albumsRated: number;
  followers: number;
  following: number;
  pfp: string;
}

export default function UserInfo({ name, albumsRated, followers, following, pfp }: UserInfoProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const findFollowers = () => {
    navigate('/follows', {
      state: { 
        listType: 'followers',
        username: name
      }
    });
  }

  const findFollowing = () => {
    navigate('/follows', {
      state: { 
        listType: 'following', 
        username: name
      }
    });
  }

  return (
    <div className="flex flex-row pt-24 items-start justify-start w-full text-left text-white">
      <div>
        <img src={pfp} width="100" alt="Profile" className="rounded-full" />
      </div>
      <div className="text-left px-4">
        <p className="text-gray-300">Profile</p>
        <h1 className="text-2xl font-bold text-white">{name}</h1>
        <div className="flex flex-row gap-4 text-gray-300">
          <p>Albums rated: {albumsRated}</p>
          <button className="text-gray-300 hover:underline hover:text-gray-100"
                  onClick={findFollowers}>
          Followers: {followers}
          </button>
          <button className="text-gray-300 hover:underline hover:text-gray-100" onClick={findFollowing}>Following: {following}</button>
        </div>
      </div>
    </div>
  );
}