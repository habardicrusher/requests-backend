// notifications.js - نظام الإشعارات
const notifications = {
    items: [],
    audioEnabled: true,

    init: function() {
        const saved = localStorage.getItem('gravel_notifications');
        if (saved) {
            try { this.items = JSON.parse(saved); } catch(e) {}
        }
        this.updateBadge();
        this.startPolling();
    },

    playBeep: function() {
        if (!this.audioEnabled) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                if (ctx.state === 'suspended') ctx.resume();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 880;
                gain.gain.value = 0.2;
                osc.start();
                gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.8);
                osc.stop(ctx.currentTime + 0.8);
                setTimeout(() => ctx.close(), 600);
            }
        } catch(e) {}
    },

    // إضافة إشعار طلب جديد مع التوزيع
    addOrderWithDistribution: function(order, distributionResult) {
        const existing = this.items.find(n => !n.read && n.factory === order.factory && n.material === order.material);
        let notification;
        
        const distributionInfo = distributionResult ? 
            `✅ تم التوزيع: ${distributionResult.totalDistributed} طلب على ${distributionResult.trucksUsed} سيارة (آخر رود ${distributionResult.lastRoad})` : 
            '⚠️ لم يتم التوزيع بعد';
        
        if (existing) {
            existing.count++;
            existing.distributionInfo = distributionInfo;
            existing.timestamp = new Date().toLocaleTimeString('ar-SA');
            notification = existing;
        } else {
            notification = {
                id: Date.now(),
                type: 'order',
                factory: order.factory,
                material: order.material,
                count: order.count || 1,
                distributionInfo: distributionInfo,
                timestamp: new Date().toLocaleTimeString('ar-SA'),
                read: false
            };
            this.items.unshift(notification);
        }
        
        if (this.items.length > 50) this.items.pop();
        localStorage.setItem('gravel_notifications', JSON.stringify(this.items));
        this.playBeep();
        this.showPopup(order, distributionResult);
        this.updateBadge();
        if (window.renderNotifications) window.renderNotifications();
        return notification;
    },
    
    // إضافة إشعار توزيع عام
    addDistributionNotification: function(result) {
        const notification = {
            id: Date.now(),
            type: 'distribution',
            title: '🔄 توزيع تلقائي',
            message: `تم توزيع ${result.totalOrders} طلب على ${result.trucksUsed} سيارة (الرود ${result.lastRoad})`,
            details: result.details,
            timestamp: new Date().toLocaleTimeString('ar-SA'),
            read: false
        };
        this.items.unshift(notification);
        localStorage.setItem('gravel_notifications', JSON.stringify(this.items));
        this.playBeep();
        this.showDistributionPopup(result);
        this.updateBadge();
        if (window.renderNotifications) window.renderNotifications();
    },

    showPopup: function(order, distributionResult) {
        let container = document.getElementById('notifyPopup');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifyPopup';
            container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10000;background:#1a1a2e;border-right:4px solid #38ef7d;border-radius:12px;padding:15px;box-shadow:0 4px 15px rgba(0,0,0,0.3);min-width:300px;direction:rtl';
            document.body.appendChild(container);
        }
        
        const distText = distributionResult ? 
            `<div style="font-size:0.75em;color:#38ef7d;margin-top:5px;">✅ توزيع: ${distributionResult.totalDistributed} طلب على ${distributionResult.trucksUsed} سيارة</div>` : '';
        
        container.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px">
                <div style="font-size:28px">📋</div>
                <div style="flex:1">
                    <div style="font-weight:bold">طلب جديد!</div>
                    <div>🏭 ${order.factory}</div>
                    <div>📦 ${order.material}</div>
                    <div>🔢 ${order.count || 1} طلب</div>
                    ${distText}
                    <div style="font-size:0.7em;color:#a8b2d1;margin-top:5px">${new Date().toLocaleTimeString('ar-SA')}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:#fff;cursor:pointer">✕</button>
            </div>
        `;
        setTimeout(() => { if(container && container.parentElement) container.remove(); }, 8000);
    },
    
    showDistributionPopup: function(result) {
        let container = document.getElementById('notifyPopup');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifyPopup';
            container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10000;background:#1a1a2e;border-right:4px solid #4facfe;border-radius:12px;padding:15px;box-shadow:0 4px 15px rgba(0,0,0,0.3);min-width:300px;direction:rtl';
            document.body.appendChild(container);
        }
        container.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px">
                <div style="font-size:28px">🔄</div>
                <div style="flex:1">
                    <div style="font-weight:bold">توزيع تلقائي!</div>
                    <div>📊 تم توزيع ${result.totalOrders} طلب</div>
                    <div>🚛 على ${result.trucksUsed} سيارة</div>
                    <div>🔄 الرود ${result.lastRoad}</div>
                    <div style="font-size:0.7em;color:#a8b2d1;margin-top:5px">${new Date().toLocaleTimeString('ar-SA')}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:#fff;cursor:pointer">✕</button>
            </div>
        `;
        setTimeout(() => { if(container && container.parentElement) container.remove(); }, 8000);
    },

    updateBadge: function() {
        const unread = this.items.filter(n => !n.read).length;
        const title = document.title.replace(/^\(\d+\)\s*/, '');
        document.title = unread > 0 ? `(${unread}) ${title}` : title;
    },

    startPolling: function() {
        let lastNotifiedId = localStorage.getItem('lastNotifiedOrderId') || '';
        setInterval(async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const res = await fetch(`/api/day/${today}`, { credentials: 'include' });
                const data = await res.json();
                const orders = data.orders || [];
                if (orders.length > 0 && orders[0].id !== lastNotifiedId) {
                    const newOrder = orders[0];
                    // جلب التوزيع الحالي
                    const distRes = await fetch(`/api/day/${today}`, { credentials: 'include' });
                    const distData = await distRes.json();
                    const distribution = distData.distribution || [];
                    this.addOrderWithDistribution(newOrder, {
                        totalDistributed: distribution.length,
                        trucksUsed: new Set(distribution.map(d => d.truck?.number)).size,
                        lastRoad: distribution.length ? Math.max(...distribution.map(d => d.road)) : 0
                    });
                    localStorage.setItem('lastNotifiedOrderId', orders[0].id);
                }
            } catch(e) {}
        }, 8000);
    },

    getUnread: function() { return this.items.filter(n => !n.read); },
    markAsRead: function(id) {
        const n = this.items.find(i => i.id == id);
        if (n) n.read = true;
        localStorage.setItem('gravel_notifications', JSON.stringify(this.items));
        this.updateBadge();
        if (window.renderNotifications) window.renderNotifications();
    },
    markAllAsRead: function() {
        this.items.forEach(n => n.read = true);
        localStorage.setItem('gravel_notifications', JSON.stringify(this.items));
        this.updateBadge();
        if (window.renderNotifications) window.renderNotifications();
    },
    delete: function(id) {
        this.items = this.items.filter(i => i.id != id);
        localStorage.setItem('gravel_notifications', JSON.stringify(this.items));
        this.updateBadge();
        if (window.renderNotifications) window.renderNotifications();
    },
    toggleSound: function() {
        this.audioEnabled = !this.audioEnabled;
        localStorage.setItem('soundEnabled', this.audioEnabled);
        return this.audioEnabled;
    }
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => notifications.init());
else notifications.init();
