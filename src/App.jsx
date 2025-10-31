import React from "react";
import { Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import Signin from "./pages/Signin";
import Signup from "./pages/Signup";
import Project from "./pages/Project";
import ProjectPages from "./pages/ProjectPages.jsx";
import RepositoryPage from "./pages/RepositoryPage";
import Profile from "./pages/Profile";
import EditorPage from "./pages/EditorPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/signin" element={<Signin />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/project" element={<Project />} />
      <Route path="/browseprojects" element={<ProjectPages />} />
      <Route path="/repositorypage" element={<RepositoryPage />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/editor" element={<EditorPage />} />
    </Routes>
  );
}

export default App;
