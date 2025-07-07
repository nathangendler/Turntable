import React, { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import Headerbar from './Headerbar';

interface FeedPost {
  id: number;
  user_id: number;
  username: string;
  album_id: number;
  album_name: string;
  artist_name: string;
  release_year: number;
  record_type: string;
  record_image: string;
  rating: number;
  created_at: string;
  is_following: boolean;
}

interface FeedResponse {
  posts: FeedPost[];
  hasMore: boolean;
  page: number;
  totalPosts: number;
}

interface InfiniteFeedProps {
  user: { id: number; username: string } | null;
}

const processImageUrl = (imageUrl: string) => {
  return `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=800&h=800`;
};

const PostCard = ({ post }: { post: FeedPost }) => {
  const getRatingColor = (rating: number) => {
    if (rating < 3.3) {
      return "bg-red-600";
    } else if (rating >= 3.3 && rating <= 6.6) {
      return "bg-yellow-600";
    } else {
      return "bg-green-600";
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-4">
        <img 
          src={processImageUrl(post.record_image)} 
          alt={`${post.album_name} cover`}
          className="w-16 h-16 rounded object-cover"
          onError={(e) => {
            e.currentTarget.src = '/default-album-cover.jpg';
          }}
        />
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-white font-semibold">{post.username}</span>
            {post.is_following && (
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                Following
              </span>
            )}
            <span className="text-gray-400 text-sm">rated</span>
          </div>
          <h3 className="text-white font-bold text-lg">{post.album_name}</h3>
          <p className="text-gray-300">by {post.artist_name}</p>
          <p className="text-gray-400 text-sm">{post.release_year} • {post.record_type}</p>
          <div className="mt-2">
            <span className={`${getRatingColor(post.rating)} text-white px-2 py-1 rounded text-sm font-bold`}>
              {post.rating}/10
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
  </div>
);

export default function InfiniteFeed({ user }: InfiniteFeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  const fetchPosts = useCallback(async (pageToFetch: number, isFirstLoad = false) => {
    if (!user || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/getFeed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          page: pageToFetch,
          limit: 10,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: FeedResponse = await response.json();

      if (isFirstLoad) {
        setPosts(data.posts);
      } else {
        setPosts(prev => [...prev, ...data.posts]);
      }

      setHasMore(data.hasMore);
      setPage(pageToFetch);
    } catch (err) {
      console.error('Error fetching feed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      fetchPosts(0, true);
    }
  }, [user]);

  useEffect(() => {
    if (inView && hasMore && !loading && user) {
      fetchPosts(page + 1);
    }
  }, [inView, hasMore, loading, page, user, fetchPosts]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Headerbar />
        <div className="pt-24 flex items-center justify-center">
          <p className="text-white text-lg">Please log in to view your feed</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 px-4">
        <Headerbar />
        <div className="pt-24 max-w-2xl mx-auto">
          <div className="bg-red-800 text-white p-4 rounded-lg">
            <h2 className="font-bold mb-2">Error loading feed</h2>
            <p>{error}</p>
            <button 
              onClick={() => fetchPosts(0, true)}
              className="mt-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 px-4">
      <Headerbar />
      <div className="pt-24 max-w-2xl mx-auto">
        <h1 className="text-white text-2xl font-bold mb-6">Your Music Feed</h1>
        
        {posts.length === 0 && !loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No posts in your feed yet!</p>
            <p className="text-gray-500 mt-2">
              Follow other users or wait for them to rate some albums.
            </p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={`${post.id}-${post.user_id}`} post={post} />
            ))}
            
            {loading && <LoadingSpinner />}
            
            {hasMore && !loading && (
              <div ref={ref} className="h-4" />
            )}
            
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400">You've reached the end of your feed!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}