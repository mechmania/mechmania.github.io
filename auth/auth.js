class AuthManager {
    constructor() {
        // this.apiBaseUrl = 'http://localhost:8080';
        // this.apiBaseUrl = 'https://api-mechmania.duckdns.org';
        this.apiBaseUrl = 'https://api-mechmania.duckdns.org';
        this.tokenKey = 'mm31_jwt_token';
        this.userKey = 'mm31_user_data';
        this.init();
    }

    init() {
        console.log('AuthManager initializing...');
        
        // Check if user is already logged in
        const token = this.getToken();
        if (token && this.isTokenValid(token)) {
            console.log('Valid token found, updating UI for logged in user');
            this.updateUIForLoggedInUser();
        } else {
            console.log('No valid token found, updating UI for logged out user');
            this.updateUIForLoggedOutUser();
        }

        // Bind event listeners when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindEventListeners());
        } else {
            this.bindEventListeners();
        }
    }

    // Check if we're on an auth page
    isOnAuthPage() {
        const path = window.location.pathname;
        return path.includes('/auth/login.html') || path.includes('/auth/register.html');
    }

    bindEventListeners() {
        console.log('Binding event listeners...');
        
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Logout button (using event delegation)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('logout-btn') || e.target.closest('.logout-btn')) {
                e.preventDefault();
                this.logout();
            }
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        this.showLoading('loginForm');
        this.hideMessages();
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.token) {
                this.setToken(data.token);
                this.setUserData({ username, password });
                this.showSuccess('Login successful! Redirecting...');
                console.log('Login successful, response: ', data);
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                this.showError(data.message || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            this.showError('Network error. Please check with administrator.');
            console.error('Login error:', error);
        } finally {
            this.hideLoading('loginForm');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate passwords match
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        this.showLoading('registerForm');
        this.hideMessages();

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, email })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('Registration successful! Please login with your credentials.');
                console.log('Registration successful, response: ', data);
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                this.showError(data.message || 'Registration failed. Please try again.');
            }
        } catch (error) {
            this.showError('Network error. Please check with administrator.');
            console.error('Registration error:', error);
        } finally {
            this.hideLoading('registerForm');
        }
    }

    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
        // Also set as cookie for additional security
        const expires = new Date();
        expires.setDate(expires.getDate() + 1); // 1 day expiry
        document.cookie = `${this.tokenKey}=${token}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
    }

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    setUserData(userData) {
        localStorage.setItem(this.userKey, JSON.stringify(userData));
    }

    getUserData() {
        const userData = localStorage.getItem(this.userKey);
        return userData ? JSON.parse(userData) : null;
    }

    isTokenValid(token) {
        if (!token) return false;
        
        try {
            // Decode JWT token to check expiration
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            
            return payload.exp > currentTime;
        } catch (error) {
            console.error('Error validating token:', error);
            return false;
        }
    }

    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        // Clear cookie
        document.cookie = `${this.tokenKey}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;`;
        
        this.updateUIForLoggedOutUser();
        window.location.href = '/';
    }

    updateUIForLoggedInUser() {
        const userData = this.getUserData();
        if (userData) {
            this.updateNavigation(userData);
        }
    }

    updateUIForLoggedOutUser() {
        this.updateNavigation(null);
    }

    updateNavigation(userData) {
        console.log('Updating navigation...', userData);
        
        // Check if we're on an auth page - if so, hide auth buttons
        if (this.isOnAuthPage()) {
            console.log('On auth page, hiding auth buttons');
            this.hideAuthButtons();
            return;
        }
        
        // Try multiple times if auth container not found
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryUpdate = () => {
            const authContainer = document.querySelector('.auth-container');
            
            if (!authContainer) {
                attempts++;
                console.log(`Auth container not found, attempt ${attempts}/${maxAttempts}`);
                
                if (attempts < maxAttempts) {
                    setTimeout(tryUpdate, 200);
                }
                return;
            }

            console.log('Auth container found, updating...');

            if (userData) {
                authContainer.innerHTML = `
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle d-flex align-items-center px-3 py-2 rounded-pill bg-light text-dark" 
                           href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false"
                           style="transition: all 0.3s ease;">
                            <div class="user-avatar me-2 d-flex align-items-center justify-content-center" 
                                 style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                        border-radius: 50%; color: white; font-weight: bold; font-size: 14px;">
                                ${userData.username.charAt(0).toUpperCase()}
                            </div>
                            <span class="fw-semibold">${userData.username}</span>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0" style="min-width: 200px; border-radius: 12px;">
                            <li>
                                <div class="dropdown-header px-3 py-2 border-bottom">
                                    <div class="d-flex align-items-center">
                                        <div class="user-avatar me-2" 
                                             style="width: 24px; height: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                                    border-radius: 50%; color: white; font-weight: bold; font-size: 12px;
                                                    display: flex; align-items: center; justify-content: center;">
                                            ${userData.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div class="fw-semibold text-dark">${userData.username}</div>
                                            <small class="text-muted">${userData.email || 'User'}</small>
                                        </div>
                                    </div>
                                </div>
                            </li>
                            <li>
                                <a class="dropdown-item logout-btn px-3 py-2 d-flex align-items-center text-danger" 
                                   href="#" style="transition: all 0.2s ease;">
                                    <i class="fas fa-sign-out-alt me-2"></i>
                                    Sign Out
                                </a>
                            </li>
                        </ul>
                    </li>
                `;
            } else {
                authContainer.innerHTML = `
                    <li class="nav-item">
                        <div class="d-flex" style="gap: 0px;">
                            <a class="nav-link btn px-3 py-2 rounded-pill auth-login-btn" 
                            href="/auth/login.html" 
                            style="transition: all 0.3s ease; font-weight: 500; border: none; color: white; margin-right: 0px; z-index: 2;">
                                <i class="fas fa-sign-in-alt me-1"></i>Login
                            </a>
                            <a class="nav-link btn px-3 py-2 rounded-pill text-white auth-register-btn" 
                            href="/auth/register.html" 
                            style="transition: all 0.3s ease; font-weight: 500; border: none; margin-right: 15px; z-index: 1;">
                                <i class="fas fa-user-plus me-1"></i>Register
                            </a>
                        </div>
                    </li>
                `;
            }            
        };
        
        tryUpdate();
    }

    hideAuthButtons() {
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryHide = () => {
            const authContainer = document.querySelector('.auth-container');
            
            if (!authContainer) {
                attempts++;
                console.log(`Auth container not found, attempt ${attempts}/${maxAttempts}`);
                
                if (attempts < maxAttempts) {
                    setTimeout(tryHide, 200);
                }
                return;
            }

            console.log('Auth container found, hiding auth buttons...');
            authContainer.style.display = 'none';
        };
        
        tryHide();
    }

    // Helper methods for UI feedback
    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
        
        if (successDiv) {
            successDiv.style.display = 'none';
        }
    }

    showSuccess(message) {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
        }
        
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    hideMessages() {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        
        if (errorDiv) errorDiv.style.display = 'none';
        if (successDiv) successDiv.style.display = 'none';
    }

    showLoading(formId) {
        const form = document.getElementById(formId);
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
        }
    }

    hideLoading(formId) {
        const form = document.getElementById(formId);
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = formId === 'loginForm' ? 'Login' : 'Register';
        }
    }

    // Method to make authenticated API requests
    async makeAuthenticatedRequest(url, options = {}) {
        const token = this.getToken();
        
        if (!token || !this.isTokenValid(token)) {
            this.logout();
            throw new Error('No valid token available');
        }

        const authenticatedOptions = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        try {
            const response = await fetch(url, authenticatedOptions);
            
            if (response.status === 401) {
                // Token is invalid or expired
                this.logout();
                console.warn('Token expired or invalid, response: ', data);
                throw new Error('Authentication failed');
            }
            
            return response;
        } catch (error) {
            console.error('Authenticated request failed:', error);
            throw error;
        }
    }
}

// Initialize auth manager when script loads
console.log('Creating AuthManager instance...');
window.authManager = new AuthManager();
