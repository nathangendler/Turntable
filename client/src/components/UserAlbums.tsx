import { useEffect, useState } from 'react'
import '../index.css';
import { AlbumRating } from '../types/index';

interface UserAlbumsProps {
    username?: string;
    userRatings: AlbumRating[];
    self: boolean;
}

export default function UserAlbums({ username, userRatings, self }: UserAlbumsProps){
    return(
        <div className="mt-8 text-white">
            {self && <h2 className="text-xl font-bold mb-4 text-center">Your Albums</h2>}
            {!userRatings || userRatings.length === 0 ? (
                self ? (
                    <p className="text-gray-300 text-center">No albums rated yet. Start exploring music!</p>
                ) : (
                    <p className="text-gray-300 text-center">No albums rated yet.</p>
                )
            ) : (
            <ul className="space-y-2">
                {userRatings.map((album, idx) => (
                <li key={idx} className="bg-gray-800 p-4 rounded">
                    <p className="font-semibold">{album.album_name} — {album.artist_name}</p>
                    <p className="text-sm text-gray-400">Rating: {album.rating}/10</p>
                </li>
                ))}
            </ul>
            )}
        </div>
    );
}