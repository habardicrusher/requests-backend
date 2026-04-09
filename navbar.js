// navbar.js - شريط التنقل الموحد مع دعم الجلسات والـ credentials
(function() {
    // دالة مساعدة لطلب API مع credentials
    async function apiCall(endpoint, method = 'GET', data = null) {
        const options = { 
            method, 
            headers: { 'Content-Type': 'application/json' }, 
            credentials: 'include'   // مهم جدًا للحفاظ على الجلسة
        };
        if (data && (method === 'POST' || method === 'PUT')) options.body = JSON.stringify(data);
        const res = await fetch(`/api${endpoint}`, options);
        if (res.status === 401) {
            window.location.href = '/login.html';
            throw new Error('غير مصرح');
        }
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    // Keep-alive: كل 5 دقائق للحفاظ على الجلسة
    setInterval(async () => {
        try {
            await fetch('/api/me', { credentials: 'include' });
            console.log('navbar keep-alive');
        } catch(e) {}
    }, 5 * 60 * 1000);

    async function renderNavbar() {
        try {
            // التحقق من صحة الجلسة
            const data = await apiCall('/me');
            if (!data.user) {
                window.location.href = '/login.html';
                return;
            }
        } catch(e) {
            window.location.href = '/login.html';
            return;
        }

        let navContainer = document.querySelector('.nav-links');
        if (!navContainer) {
            const container = document.querySelector('.container');
            if (!container) return;
            const header = document.querySelector('.header');
            if (header && header.nextSibling) {
                navContainer = document.createElement('div');
                navContainer.className = 'nav-links';
                header.insertAdjacentElement('afterend', navContainer);
            } else {
                return;
            }
        }

        const links = [
            { href: 'index.html', text: '📊 الرئيسية' },
            { href: 'orders.html', text: '📝 الطلبات' },
            { href: 'distribution.html', text: '🚚 التوزيع' },
            { href: 'trucks.html', text: '🚛 السيارات' },
            { href: 'products.html', text: '📦 أنواع البحص' },
            { href: 'factories.html', text: '🏭 المصانع' },
            { href: 'reports.html', text: '📊 التقارير' },
            { href: 'settings.html', text: '⚙️ الإعدادات' },
            { href: 'restrictions.html', text: '⛔ الحظر' },
            { href: 'users.html', text: '👥 المستخدمين' },
            { href: 'logs.html', text: '📜 السجلات' }
        ];

        const currentPage = window.location.pathname.split('/').pop();
        navContainer.innerHTML = links.map(link => `
            <a href="${link.href}" class="nav-link ${currentPage === link.href ? 'active' : ''}">${link.text}</a>
        `).join('');

        // إضافة زر تسجيل الخروج مرة واحدة فقط
        if (!document.getElementById('logout-btn-container')) {
            const logoutDiv = document.createElement('div');
            logoutDiv.id = 'logout-btn-container';
            logoutDiv.style.cssText = 'position: absolute; top: 20px; left: 20px; z-index: 100;';
            const logoutBtn = document.createElement('button');
            logoutBtn.innerHTML = '🚪 تسجيل الخروج';
            logoutBtn.style.cssText = `
                background: linear-gradient(135deg, #f5576c, #eb3349);
                border: none;
                padding: 8px 20px;
                border-radius: 25px;
                color: white;
                font-weight: bold;
                cursor: pointer;
                transition: 0.3s;
                font-size: 14px;
            `;
            logoutBtn.onmouseover = () => logoutBtn.style.transform = 'scale(1.05)';
            logoutBtn.onmouseout = () => logoutBtn.style.transform = 'scale(1)';
            logoutBtn.onclick = () => {
                if (confirm('⚠️ هل أنت متأكد من تسجيل الخروج؟')) {
                    fetch('/api/logout', { method: 'POST', credentials: 'include' })
                        .then(() => { window.location.href = '/login.html'; })
                        .catch(() => { window.location.href = '/login.html'; });
                }
            };
            logoutDiv.appendChild(logoutBtn);
            const header = document.querySelector('.header');
            if (header) {
                header.style.position = 'relative';
                header.appendChild(logoutDiv);
            }
        }
    }

    // بدء التشغيل بعد تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderNavbar);
    } else {
        renderNavbar();
    }
})();
