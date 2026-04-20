(function() {
    setInterval(async () => {
        try {
            await fetch('/api/me', { credentials: 'include' });
        } catch(e) {}
    }, 3 * 60 * 1000);

    async function renderNavbar() {
        try {
            const res = await fetch('/api/me', { credentials: 'include' });
            const data = await res.json();
            if (!data.user) {
                window.location.href = '/login.html';
                return;
            }
            const role = data.user.role;
            const permissions = data.user.permissions || [];
            const isAdmin = (role === 'admin');
            
            // تعريف الروابط مع الصلاحيات المطلوبة
            const navLinks = [
                { href: 'index.html', text: '📊 الرئيسية', permission: null }, // الكل يرى الرئيسية
                { href: 'orders.html', text: '📝 الطلبات', permission: 'view_orders' },
                { href: 'distribution.html', text: '🚚 التوزيع', permission: 'view_distribution' },
                { href: 'trucks.html', text: '🚛 السيارات', permission: 'view_trucks' },
                { href: 'products.html', text: '📦 أنواع البحص', permission: 'view_products' },
                { href: 'factories.html', text: '🏭 المصانع', permission: 'view_factories' },
                { href: 'reports.html', text: '📊 تقارير الكسارة', permission: 'view_reports' },
                { href: 'scale_report.html', text: '⚖️ تقارير الميزان الشهرية', permission: 'view_scale_report' },
                { href: 'trucks-failed.html', text: '⚠️ السيارات غير المستوفية', permission: 'view_failed_trucks' },
                { href: 'trucks-failed-report.html', text: '📊 تقرير الغير مستوفية', permission: 'view_failed_trucks' },
                { href: 'distribution-quality.html', text: '📈 جودة التوزيع', permission: 'view_reports' },
                { href: 'settings.html', text: '⚙️ الإعدادات', permission: 'view_settings' },
                { href: 'restrictions.html', text: '⛔ الحظر', permission: 'manage_restrictions' },
                { href: 'users.html', text: '👥 المستخدمين', permission: 'manage_users' },
                { href: 'logs.html', text: '📜 السجلات', permission: 'view_logs' }
            ];

            // تصفية الروابط حسب الصلاحيات
            let linksToShow = [];
            for (const link of navLinks) {
                if (isAdmin) {
                    linksToShow.push(link);
                } else if (link.permission === null) {
                    linksToShow.push(link); // الرئيسية دائماً
                } else if (permissions.includes(link.permission)) {
                    linksToShow.push(link);
                }
            }

            let navContainer = document.querySelector('.nav-links');
            if (!navContainer) {
                const header = document.querySelector('.header');
                if (header) {
                    navContainer = document.createElement('div');
                    navContainer.className = 'nav-links';
                    header.insertAdjacentElement('afterend', navContainer);
                } else return;
            }

            const currentPage = window.location.pathname.split('/').pop();
            navContainer.innerHTML = linksToShow.map(link => `<a href="${link.href}" class="nav-link ${currentPage === link.href ? 'active' : ''}">${link.text}</a>`).join('');

            if (!document.getElementById('logout-btn-container')) {
                const logoutDiv = document.createElement('div');
                logoutDiv.id = 'logout-btn-container';
                logoutDiv.style.cssText = 'position: absolute; top: 20px; left: 20px; z-index: 100;';
                const logoutBtn = document.createElement('button');
                logoutBtn.innerHTML = '🚪 تسجيل الخروج';
                logoutBtn.style.cssText = `background: linear-gradient(135deg, #f5576c, #eb3349); border: none; padding: 8px 20px; border-radius: 25px; color: white; font-weight: bold; cursor: pointer; font-size: 14px;`;
                logoutBtn.onclick = () => {
                    if (confirm('⚠️ هل أنت متأكد من تسجيل الخروج؟')) {
                        fetch('/api/logout', { method: 'POST', credentials: 'include' }).then(() => window.location.href = '/login.html');
                    }
                };
                logoutDiv.appendChild(logoutBtn);
                const header = document.querySelector('.header');
                if (header) {
                    header.style.position = 'relative';
                    header.appendChild(logoutDiv);
                }
            }
        } catch(e) {
            console.error('Navbar error:', e);
            window.location.href = '/login.html';
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderNavbar);
    else renderNavbar();
})();
