// js/api.js
const API_BASE = window.location.origin.includes('localhost') 
    ? 'http://localhost:3000/api' 
    : '/api'; 

async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        
        if (response.status === 401) {
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
            return null;
        }
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'خطأ في السيرفر');
        }
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
