import React from 'react';
import defaultProfile from '../assets/defaultProfile.jpg';
import { useNavigate } from 'react-router-dom';
import '../index.css';
function Profile(){
    const navigate = useNavigate();
    const handleClick = () => {
        navigate('/home');
    }
    return(
        <div>
            <button className="text-white font-bold text-lg hover:text-gray-300 transition-colors"
                    onClick={handleClick}>
                Profile
            </button>
        </div>
    );
}

export default Profile;