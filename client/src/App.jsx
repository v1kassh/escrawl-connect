import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async'; // Import HelmetProvider
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Video from './components/Video';
import VideoHome from './components/VideoHome';
import Chat from './components/Chat';
import AdminPanel from './components/AdminPanel';
import Layout from './components/Layout';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <div className="min-h-screen bg-slate-900 text-white font-sans">
          <Routes>
            <Route path="/" element={<Login />} />

            <Route path="/dashboard" element={
              <Layout>
                <Dashboard />
              </Layout>
            } />

            <Route path="/chat" element={
              <Layout>
                <Chat />
              </Layout>
            } />

            {/* Video Landing Page - New Meeting / Join Code */}
            <Route path="/video" element={
              <Layout>
                <VideoHome />
              </Layout>
            } />

            {/* Video Call Room */}
            <Route path="/video/:roomId" element={
              <Layout>
                <Video />
              </Layout>
            } />

            <Route path="/admin" element={
              <Layout>
                <AdminPanel />
              </Layout>
            } />
          </Routes>
        </div>
      </Router>
    </HelmetProvider>
  );
}

export default App;
