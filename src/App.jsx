import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

// importing all files to be used for routes
import './App.css'
import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Signin from './pages/Signin';
import Project from './pages/Project';
import FloridaTech from './pages/FloridaTech';
import ProjectPages from './pages/ProjectPages.jsx';
import RepositoryPage from './pages/RepositoryPage';
import Profile from './pages/Profile'; //

function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/Signin" element={<Signin />} /> {/* Route to sign in*/}
            <Route path= "/Project" element={<Project />} /> {/* Route to sign make project*/}
            <Route path="/fltech" element={<FloridaTech />} /> {/* Route to fltech page (don't think we are using)*/}
            *<Route path="/browseprojects" element={<ProjectPages/>} /> {/* Route to browse projects*/}
            <Route path="/repositorypage" element={<RepositoryPage/>} /> {/* Route to change the project before displayed*/}
            <Route path="/profile" element={<Profile />} />  {/* Route to get to your porfile*/}
        </Routes>
    );
}

export default App;
