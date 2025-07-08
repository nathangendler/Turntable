import React from 'react';
import '../index.css';
import { Album } from '../types'; 

interface AlbumCardProps {
  idx: number; 
  album: Album;
  handleClick: () => void; 
}

export default function AlbumCard({ idx, album, handleClick }: AlbumCardProps) {
  return (
    <button
      onClick={handleClick}
      className="w-full aspect-[2/3] border border-gray-300 rounded-lg overflow-hidden flex flex-col hover:border-gray-400 transition-colors"
    >
      {album.image_url && (
        <img
          src={`https://images.weserv.nl/?url=${encodeURIComponent(album.image_url)}&w=800&h=800`}
          alt={`${album.album_name} cover`}
          className="w-full h-1/2 object-cover"
          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
            console.error('Image failed to load:', album.image_url);
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      )}
      <div className="flex flex-col justify-center text-sm text-center p-2 h-1/2">
        <p><strong>Artist:</strong> {album.artist_name || 'Unknown'}</p>
        <p><strong>Album:</strong> {album.album_name || 'Unknown'}</p>
        <p><strong>Year:</strong> {album.release_date || 'Unknown'}</p>
        <p><strong>Type:</strong> {album.record_type || 'Unknown'}</p>
      </div>
    </button>
  );
}