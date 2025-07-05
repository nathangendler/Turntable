export interface User {
  id: number;
  username: string;
}

export interface UserRating {
  id: number;
  rating: number;
  album_name: string;
  artist_name: string;
  user_rating: number;
}

export interface FollowData {
  relationship_type: 'follower' | 'following';
}

export interface FollowState {
  followers: FollowData[];
  following: FollowData[];
}

export interface Album {
  image_url: string | null;
  artist_name: string | null;
  album_name: string | null;
  release_date: string | null;
  record_type: string | null;
  album_url: string | null;
}

export interface SearchInfo {
    username: string,
    followers: number[],
    following: number[],
    ratings_count: number,
    albums: AlbumRating[]
}

export interface AlbumRating {
    album_id: number,
    album_name: string,
    artist_name: string, 
    release_year: number,
    record_type: string,
    record_image: string,
    rating: number
}