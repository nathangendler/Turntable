import React from 'react';
import searchButton from '../assets/searchButton.jpg';
import { useNavigate } from 'react-router-dom';
import {useState} from 'react';
import '../index.css';
import { AudioLines } from 'lucide-react';
import { UserSearch } from 'lucide-react';

function Searchbar(){
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleAlbum = () => {
        if (!query.trim()) return;
        navigate('/searchAlbum', {state: {query}});
    };

    const handleUser = () => {
        if(!query.trim()) return;
        navigate('/searchUser', {state: {query}})
    }


    return(
    <div className="flex items-center gap-2">
        <input 
            type="text" 
            placeholder="Search for album or user..." 
            value={query}
            className="px-4 py-2 rounded-full border border-gray-700 focus:outline-none focus:border-gray-100 bg-gray-500 text-gray-900" 
            onChange={(e) => setQuery(e.target.value)}
        />
        <button 
        className="px-4 py-2 rounded-full border border-gray-700 focus:outline-none bg-gray-500 hover:bg-gray-100 transition-colors"
        onClick={handleAlbum}>
            <AudioLines color='white'/>
        </button>
        <button 
        className="px-4 py-2 rounded-full border border-gray-700 focus:outline-none bg-gray-500 hover:bg-gray-100 transition-colors"
        onClick={handleUser}>
            <UserSearch color='white'/>
        </button>
    </div>
    );
}

export default Searchbar;
