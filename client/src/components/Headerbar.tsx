import React from 'react';
import Homelogo from './Homelogo';
import Searchbar from './Searchbar';
import Profile from './Profile';
import '../index.css';
function Headerbar(){
    return(
    <div className="fixed top-0 left-0 w-full z-50 flex justify-between items-center h-18 bg-gray-700 px-4">
        <Homelogo />
        <Searchbar />
        <Profile />
    </div>
    );
}

export default Headerbar;