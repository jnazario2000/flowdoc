import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Signin from './pages/Signin';
import Project from './pages/Project';
import FloridaTech from './pages/FloridaTech';
import ProjectPages from './pages/ProjectPages.jsx';
import RepositoryPage from './pages/RepositoryPage';


function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/Signin" element={<Signin />} />
            <Route path= "/Project" element={<Project />} />
            <Route path="/fltech" element={<FloridaTech />} />
            <Route path="/pages" element={<ProjectPages/>} />
            <Route path="/repository" element={<RepositoryPage/>} />
        </Routes>
    );
}

export default App
