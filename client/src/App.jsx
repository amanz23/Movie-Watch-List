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

  return (
    <>
      <header className="header">
        <div className="account-controls muted">
          {user ? <>
            <span>{user.email}</span>
            <button type="button" className="link" onClick={signOut}>Sign out</button>
          </> : !checking ? <a className="link" href="#sign-in">Sign in</a> : null}
        </div>
        <h1>Movie Watchlist</h1>
      </header>
      <main className="app">
        {checking ? <p className="muted">Loading…</p> : user ? <Watchlist /> : <AuthForm onAuthenticated={setUser} />}
      </main>
    </>
  );
}
