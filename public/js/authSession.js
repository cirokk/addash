async function ensureAuthenticatedPage() {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (!res.ok) {
            sessionStorage.clear();
            window.location.href = '/index.html';
            return null;
        }

        const user = await res.json();
        sessionStorage.setItem('userId', user.id);
        sessionStorage.setItem('role', user.role);
        sessionStorage.setItem('clientId', user.client_id || '');
        sessionStorage.setItem('username', user.username || '');
        return user;
    } catch (e) {
        sessionStorage.clear();
        window.location.href = '/index.html';
        return null;
    }
}

window.ensureAuthenticatedPage = ensureAuthenticatedPage;
