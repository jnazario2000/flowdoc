import React from "react";
import { Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import Signin from "./pages/Signin";
import Project from "./pages/Project";                 // (the file above)
import FloridaTech from "./pages/FloridaTech";         // optional: remove if you don’t have it
import ProjectPages from "./pages/ProjectPages.jsx";   // optional
import RepositoryPage from "./pages/RepositoryPage";
import Profile from "./pages/Profile";
import EditorDemo from "./pages/EditorDemo";           // the editor page you’re using

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/signin" element={<Signin />} />
      <Route path="/project" element={<Project />} />
      <Route path="/fltech" element={<FloridaTech />} />
      <Route path="/browseprojects" element={<ProjectPages />} />
      <Route path="/repositorypage" element={<RepositoryPage />} />
        <Route path="/profile" element={<Profile />} />
      <Route path="/editor" element={<EditorDemo />} />
    </Routes>
  );
}

export default App;
