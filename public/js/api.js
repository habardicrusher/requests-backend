// تحديد الرابط الأساسي بناءً على بيئة التشغيل
// إذا كنت ترفع الملفات مع السيرفر في نفس المشروع على Render، نستخدم مسار نسبي
const API_BASE = window.location.origin + '/api';

/**
 * دالة موحدة لإرسال الطلبات للسيرفر
 * تعالج مشاكل الـ Session و الـ Credentials تلقائياً
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    // إعدادات افتراضية تضمن عمل الـ Cookies (السيشن)
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        // مهم جداً: إرسال واستقبال ملفات تعريف الارتباط (Cookies)
        credentials: 'include', 
    };

    const mergeOptions = { ...defaultOptions, ...options };
    
    // دمج الـ Headers إذا تم إرسالها في options
    if (options.headers) {
        mergeOptions.headers = { ...defaultOptions.headers, ...options.headers };
    }

    try {
        const response = await fetch(url, mergeOptions);
        
        // إذا انتهت الجلسة أو غير مسجل دخول (401)
        if (response.status === 401) {
            // نتحقق إذا كنا لسنا بالفعل في صفحة تسجيل الدخول لمنع اللوب
            if (!window.location.pathname.includes('login.html')) {
                console.warn("Session expired or unauthorized. Redirecting to login...");
                window.location.href = 'login.html';
            }
            return response;
        }

        return response;
    } catch (error) {
        console.error('API connection error:', error);
        // عرض رسالة خطأ للمستخدم في الكونسول للمساعدة في التشخيص
        return null;
    }
}

// تصدير المتغيرات لاستخدامها في الملفات الأخرى
window.API_BASE = API_BASE;
window.apiRequest = apiRequest;
