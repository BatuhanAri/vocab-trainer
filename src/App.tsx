import { HashRouter, Routes, Route, NavLink } from "react-router-dom";
import AddWord from "./pages/AddWord";
import Library from "./pages/Library";
import Review from "./pages/Review";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  padding: "8px 12px",
  borderRadius: 8,
  textDecoration: "none",
  color: isActive ? "white" : "#111",
  background: isActive ? "#111" : "#eee",
  marginRight: 8,
});

export default function App() {
  return (
    <HashRouter>
      <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ marginBottom: 16 }}>
          <NavLink to="/add" style={linkStyle}>Add</NavLink>
          <NavLink to="/library" style={linkStyle}>Library</NavLink>
          <NavLink to="/review" style={linkStyle}>Review</NavLink>
        </div>

        <Routes>
          <Route path="/" element={<AddWord />} />
          <Route path="/add" element={<AddWord />} />
          <Route path="/library" element={<Library />} />
          <Route path="/review" element={<Review />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
