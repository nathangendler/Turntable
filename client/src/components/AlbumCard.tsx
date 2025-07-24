import React from 'react';
import { Album } from '../types';

interface AlbumCardProps {
  idx: number;
  album: Album;
  handleClick: () => void;
}

const AlbumCard = ({ album, handleClick }: AlbumCardProps) => {
  const hasValidImage = album.image_url && album.image_url.trim() !== '';

  return (
    <div
      className="bg-gray-800 rounded-lg p-4 mb-4 cursor-pointer hover:bg-gray-700 transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-start space-x-4">
        {hasValidImage && (
          <img
            src={`https://images.weserv.nl/?url=${album.image_url}&w=800&h=800`}
            alt={`${album.album_name} cover`}
            className="w-16 h-16 rounded object-cover"
            onError={(e) => {
              // Hide the image if it fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg">{album.album_name}</h3>
          <p className="text-gray-300">by {album.artist_name}</p>
          <p className="text-gray-400 text-sm">{album.release_date} • {album.record_type}</p>
        </div>
      </div>
    </div>
  );
};

export default AlbumCard;