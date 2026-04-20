(async function() {
    let currentPermissions = [];
    let currentRole = '';

    async function fetchUser() {
        try {
            const res = await fetch('/api/me', { credentials: 'include' });
            if (!res.ok) throw new Error();
            const data = await res.json();
            currentRole = data.user.role;
            currentPermissions = data.user.permissions || [];
            return data.user;
        } catch(e) {
            window.location.href = '/login.html';
            return null;
        }
    }

    function hasPermission(perm) {
        if (currentRole === 'admin') return true;
        return currentPermissions.includes(perm);
    }

    async function renderNavbar() {
        const user = await fetchUser();
        if (!user) return;

        const links = [
            { href: 'index.html', text: '📊 الرئيسية', perm: null },
            { href: 'orders.html', text: '📝 الطلبات', perm: 'view_orders' },
            { href: 'distribution.html', text: '🚚 التوزيع', perm: 'view_distribution' },
            { href: 'trucks.html', text: '🚛 السيارات', perm: 'view_trucks' },
            { href: 'products.html', text: '📦 أنواع البحص', perm: 'view_products' },
            { href: 'factories.html', text: '🏭 المصانع', perm: 'view_factories' },
            { href: 'reports.html', text: '📊 تقارير الكسارة', perm: 'view_reports' },
            { href: 'scale_report.html', text: '⚖️ الميزان', perm: 'view_scale_report' },
            { href: 'trucks-failed.html', text: '⚠️ السيارات غير المستوفية', perm: 'view_failed_trucks' },
            { href: 'settings.html', text: '⚙️ الإعدادات', perm: 'view_settings' },
            { href: 'users.html', text: '👥 المستخدمين', perm: 'manage_users' },
            { href: 'logs.html', text: '📜 السجلات', perm: 'view_logs' }
        ];

        let visibleLinks = links.filter(link => !link.perm || hasPermission(link.perm));
        if (user.role === 'client') {
            visibleLinks = [{ href: 'orders.html', text: '📝 طلباتي', perm: null }];
        }

        const navContainer = document.querySelector('.nav-links');
        if (navContainer) {
            const currentPage = window.location.pathname.split('/').pop();
            navContainer.innerHTML = visibleLinks.map(link => `<a href="${link.href}" class="nav-link ${currentPage === link.href ? 'active' : ''}">${link.text}</a>`).join('');
        }

        // إضافة زر logout إذا لم يكن موجوداً
        if (!document.getElementById('logout-btn-container')) {
            const header = document.querySelector('.header');
            if (header) {
                const div = document.createElement('div');
                div.id = 'logout-btn-container';
                div.style.cssText = 'position: absolute; top: 20px; left: 20px;';
                const btn = document.createElement('button');
                btn.textContent = '🚪 تسجيل الخروج';
                btn.style.cssText = 'background: linear-gradient(135deg, #f5576c, #eb3349); border: none; padding: 8px 20px; border-radius: 25px; color: white; font-weight: bold; cursor: pointer;';
                btn.onclick = () => { if(confirm('تسجيل الخروج؟')) fetch('/api/logout',{method:'POST',credentials:'include'}).then(()=>location.href='/login.html'); };
                div.appendChild(btn);
                header.style.position = 'relative';
                header.appendChild(div);
            }
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderNavbar);
    else renderNavbar();
})();
