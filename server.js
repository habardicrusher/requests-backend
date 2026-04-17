// ==================== بيانات اليوم (الطلبات والتوزيع) - نسخة آمنة ====================
app.get('/api/day/:date', async (req, res) => {
    const { date } = req.params;
    try {
        // تحقق من صحة التاريخ
        if (!date || isNaN(new Date(date).getTime())) {
            return res.status(400).json({ error: 'تاريخ غير صالح' });
        }
        
        const result = await query('SELECT orders, distribution FROM day_data WHERE date = $1', [date]);
        
        if (result.rows.length > 0) {
            // تأكد من أن البيانات هي كائنات صالحة
            const orders = result.rows[0].orders || [];
            const distribution = result.rows[0].distribution || [];
            res.json({ orders, distribution });
        } else {
            // لا توجد بيانات لذلك اليوم
            res.json({ orders: [], distribution: [] });
        }
    } catch (err) {
        console.error(`❌ خطأ في GET /api/day/${date}:`, err);
        res.status(500).json({ error: 'خطأ في قاعدة البيانات: ' + err.message });
    }
});

app.put('/api/day/:date', async (req, res) => {
    const { date } = req.params;
    const { orders, distribution } = req.body;
    
    // التحقق من صحة التاريخ والبيانات
    if (!date || isNaN(new Date(date).getTime())) {
        return res.status(400).json({ error: 'تاريخ غير صالح' });
    }
    
    if (!Array.isArray(orders) || !Array.isArray(distribution)) {
        return res.status(400).json({ error: 'بيانات غير صالحة: orders و distribution يجب أن تكون مصفوفات' });
    }
    
    try {
        // استخدام JSON.stringify للتأكد من أن البيانات بتنسيق JSON صحيح
        const ordersJson = JSON.stringify(orders);
        const distributionJson = JSON.stringify(distribution);
        
        // استعلام أكثر أماناً باستخدام CAST
        await query(`
            INSERT INTO day_data (date, orders, distribution) 
            VALUES ($1, $2::jsonb, $3::jsonb) 
            ON CONFLICT (date) 
            DO UPDATE SET orders = $2::jsonb, distribution = $3::jsonb
        `, [date, ordersJson, distributionJson]);
        
        res.json({ success: true });
    } catch (err) {
        console.error(`❌ خطأ في PUT /api/day/${date}:`, err);
        console.error('البيانات المرسلة:', { orders, distribution });
        res.status(500).json({ error: 'خطأ في حفظ البيانات: ' + err.message });
    }
});