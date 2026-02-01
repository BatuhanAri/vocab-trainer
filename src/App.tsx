import { HashRouter, Routes, Route, NavLink } from "react-router-dom";
import AddWord from "./pages/AddWord";
import Library from "./pages/Library";
import Review from "./pages/Review";

import "./App.css";


export default function App() {
  return (
    <HashRouter>
      <div className="app-shell">
        <header className="app-header">
          <div>
            <p className="app-kicker">Vocab Trainer</p>
            <h1>Kelime çalışmalarını takip et</h1>
          </div>
          <nav className="app-nav">
            <NavLink to="/add" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              Add Word
            </NavLink>
            <NavLink to="/library" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              Library
            </NavLink>
            <NavLink to="/review" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              Review
            </NavLink>
          </nav>
        </header>

        <main className="app-content">
          <Routes>
            <Route path="/" element={<AddWord />} />
            <Route path="/add" element={<AddWord />} />
            <Route path="/library" element={<Library />} />
            <Route path="/review" element={<Review />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
