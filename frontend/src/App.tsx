import { Routes, Route, Link } from "react-router-dom";
import { Header, Footer } from "./components";
import {
  Home,
  FindDoctors,
  DoctorProfile,
  AuthPage,
  Confirmation,
  About,
} from "./pages";
import { Dashboard } from "./dashboard";
export default function App() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/doctors" element={<FindDoctors />} />
          <Route path="/doctors/:id" element={<DoctorProfile />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage registerMode />} />
          <Route
            path="/appointments/:id/confirmation"
            element={<Confirmation />}
          />
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route
            path="*"
            element={
              <div className="container section">
                <h1>Page not found</h1>
                <Link to="/" className="button">
                  Back to home
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
