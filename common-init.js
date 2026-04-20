// ============================================================
// common-init.js - نظام صلاحيات مركزي (لا يحتاج common-auth.js)
// ============================================================

(function() {
    let currentUser = null;
    let currentRole = null;
    let currentPermissions = [];

    // جلب بيانات المستخدم من الخادم
    async function loadUser() {
        try {
            const res = await fetch('/api/me', { credentials: 'include' });
            if (!res.ok) {
                window.location.href = '/login.html';
                return false;
            }
            const data = await res.json();
            currentUser = data.user;
            currentRole = currentUser.role;
            currentPermissions = currentUser.permissions || [];
            return true;
        } catch (err) {
            console.error('خطأ في جلب المستخدم:', err);
            window.location.href = '/login.html';
            return false;
        }
    }

    // التحقق من صلاحية (admin يمرر كل شيء)
    function hasPermission(perm) {
        if (currentRole === 'admin') return true;
        return currentPermissions.includes(perm);
    }

    // إخفاء عنصر حسب الـ id إذا لم تكن الصلاحية موجودة
    window.hideIfNoPermission = function(permission, elementId) {
        const el = document.getElementById(elementId);
        if (el && !hasPermission(permission)) el.style.display = 'none';
    };

    // إخفاء عناصر حسب كلاس
    window.hideButtonsIfNoPermission = function(permission, className) {
        if (!hasPermission(permission)) {
            document.querySelectorAll('.' + className).forEach(el => el.style.display = 'none');
        }
    };

    // معالجة جميع العناصر التي تحمل data-permission
    function applyDataPermissions() {
        document.querySelectorAll('[data-permission]').forEach(el => {
            const required = el.getAttribute('data-permission');
            if (!hasPermission(required)) {
                el.style.display = 'none';
            }
        });
        document.querySelectorAll('[data-permission-show]').forEach(el => {
            const required = el.getAttribute('data-permission-show');
            if (hasPermission(required)) {
                el.style.display = ''; // إظهار (قد يكون مخفياً مسبقاً)
            } else {
                el.style.display = 'none';
            }
        });
    }

    // تطبيق صلاحيات شريط التنقل (إذا وجد)
    function applyNavPermissions() {
        const navContainer = document.getElementById('navLinks');
        if (!navContainer) return;
        const links = navContainer.querySelectorAll('a');
        const linkMap = {
            'orders.html': 'view_orders',
            'distribution.html': 'view_distribution',
            'trucks.html': 'view_trucks',
            'products.html': 'view_products',
            'factories.html': 'view_factories',
            'reports.html': 'view_reports',
            'scale_report.html': 'view_scale_report',
            'trucks-failed.html': 'view_failed_trucks',
            'trucks-failed-report.html': 'view_failed_trucks',
            'distribution-quality.html': 'view_reports',
            'settings.html': 'view_settings',
            'restrictions.html': 'manage_restrictions',
            'users.html': 'manage_users',
            'logs.html': 'view_logs'
        };
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            const required = linkMap[href];
            if (required && !hasPermission(required)) {
                link.style.display = 'none';
            }
        });
    }

    // وظيفة عامة لإعادة تطبيق الصلاحيات بعد إضافة عناصر ديناميكية
    window.refreshPermissions = function() {
        applyDataPermissions();
        applyNavPermissions();
    };

    // دالة حماية الصفحة بالكامل (تستخدم في بداية أي صفحة)
    window.protectPage = async function(permission, redirectUrl = '/') {
        const ok = await loadUser();
        if (!ok) return false;
        if (!hasPermission(permission)) {
            if (redirectUrl) window.location.href = redirectUrl;
            return false;
        }
        refreshPermissions();
        return true;
    };

    // دالة التهيئة الرئيسية (تستدعى عند تحميل الصفحة)
    window.initPermissions = async function() {
        const ok = await loadUser();
        if (!ok) return false;
        refreshPermissions();
        return true;
    };

    // تنفيذ التهيئة فوراً عند تحميل الملف
    (async function() {
        await initPermissions();
        // يمكن إضافة حدث لمراقبة إضافة عناصر جديدة (اختياري)
        const observer = new MutationObserver(() => refreshPermissions());
        observer.observe(document.body, { childList: true, subtree: true });
    })();
})();