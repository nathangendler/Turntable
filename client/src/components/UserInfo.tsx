import React from 'react';
import bochi from '../assets/bochiPorter.webp';
import '../index.css';
import { Button } from "@/components/ui/button"
import { AlbumRating } from '../types/index';

interface UserInfoProps {
  name?: string;
  albumsRated: number;
  followers: number;
  following: number;
  pfp: string;
}

export default function UserInfo({ name, albumsRated, followers, following, pfp }: UserInfoProps) {
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
          <button className="text-gray-300 hover:underline hover:text-gray-100">Followers: {followers}</button>
          <button className="text-gray-300 hover:underline hover:text-gray-100">Following: {following}</button>
        </div>
      </div>
    </div>
  );
}