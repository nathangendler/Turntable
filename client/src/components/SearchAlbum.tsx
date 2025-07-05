import React, { useState, useEffect } from 'react';
import Headerbar from './Headerbar';
import { useLocation } from 'react-router-dom';
import AlbumCard from './AlbumCard';
import '../index.css';
import { User, Album } from '../types';
import { CheckCircle2Icon } from 'lucide-react';
import { Button } from "@/components/ui/button"
import {
  Alert,
  AlertTitle,
} from '@/components/ui/alert';

interface SearchAlbumProps {
  user: User | null;
}

export default function SearchAlbum({ user }: SearchAlbumProps) {
  const { state } = useLocation();
  const query = state?.query || '';
  const [results, setResults] = useState<Album[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [showAlert, setShowAlert] = useState<boolean>(false);

  const handleLog = async (): Promise<void> => {
    try {
      if (!user?.username || !selectedAlbum) return;

      const roundedRating = Math.round(Number(rating) * 10) / 10;
      const response = await fetch('http://localhost:3001/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: user.username,
          selectedAlbum,
          rating: roundedRating,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Log successful:', data);
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);

        setSelectedAlbum(null);
        setRating(0);
      } else {
        console.error('Log failed:', data.message || 'Unknown error');
      }
    } catch (err) {
      console.error('Request error:', err);
    }
  };

  useEffect(() => {
    if (!query) return;

    setLoading(true);
    setError(null);

    fetch('http://localhost:3001/api/searchAlbum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data: Album[] | any) => {
        if (Array.isArray(data)) {
          setResults(data);
        } else if (data && typeof data === 'object') {
          const arrayData = Object.values(data).find((val: any) => Array.isArray(val)) as Album[] | undefined;
          setResults(arrayData || []);
        } else {
          setResults([]);
        }
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [query]);

  return (
    <div className="bg-gray-900 text-white min-h-screen relative">
      <Headerbar />
      <div className="pt-12 px-4">
        <h2 className="text-xl font-semibold mb-4">S"</h2>

        {loading && <div className="w-fit mx-auto">Loading...this will take around 10 seconds</div>}

        {error && (
          <div className="text-red-500">
            Error: {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && query && (
          <div>No results found for "{query}"</div>
        )}

        {results.length > 0 && (
          <div>
            <p className="w-fit mx-auto mb-4">Found {results.length} albums:</p>
            <div className="grid grid-cols-4 gap-4 p-4">
              {results.slice(0, 8).map((album, idx) => (
                <AlbumCard
                  key={idx}
                  idx={idx}
                  album={album}
                  handleClick={() => setSelectedAlbum(album)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedAlbum && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => {
            setSelectedAlbum(null);
            setRating(0);
          }}
        >
          <div className="absolute inset-0 backdrop-blur-sm bg-black/30 z-40" />
          <div
            className="bg-white p-6 rounded shadow-lg relative w-96 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-black">
              Rate "{selectedAlbum.album_name}":
            </h3>
            <input
              onChange={(e) => setRating(Number(e.target.value))}
              type="number"
              placeholder="Enter rating (0–10)"
              className="w-full border p-2 mb-4 text-black rounded"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedAlbum(null);
                  setRating(0);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLog}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
      {showAlert && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <Alert className="w-[24rem] shadow-lg border-green-500 border">
            <CheckCircle2Icon className="text-green-600" />
            <AlertTitle>Album logged</AlertTitle>
          </Alert>
        </div>
      )}
    </div>
  );
}
