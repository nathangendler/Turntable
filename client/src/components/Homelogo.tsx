import React from 'react'
import logo from '../assets/record.png';
import '../index.css';
import { useNavigate } from 'react-router-dom';
function Homelogo(){
    const navigate = useNavigate();
    const handleClick = () => {
        navigate('/feed');
    }
    return(
    <button 
    onClick={handleClick}
    className="text-white font-bold text-lg hover:text-gray-500 transition-colors">
        Turntable
    </button>
    );
}

export default Homelogo;