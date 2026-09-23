import { useEffect, useState } from 'react';
import AuthForm from './AuthForm.jsx';
import Watchlist from './Watchlist.jsx';
import { api, getToken, setToken } from './api.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  function signOut() {
    setToken(null);
    setUser(null);
  }

  if (checking) return <main className="app"><p className="muted">Loading…</p></main>;
  if (!user) return <main className="app"><AuthForm onAuthenticated={setUser} /></main>;

  return (
    <main className="app">
      <header className="header">
        <h1>Movie Watchlist</h1>
        <div className="muted">
          {user.email}
          <button type="button" className="link" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>
      <Watchlist />
    </main>
  );
}
